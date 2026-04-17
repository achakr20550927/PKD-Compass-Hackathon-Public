export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { CONSENT_TYPES, extractIPAddress, latestConsentStatus } from "@/lib/consents";
import { analyzeDocument } from "@/lib/document-analysis";
import { writeAuditLog } from "@/lib/audit";
import { assertHipaaReady, hipaaFailureResponse, isHipaaMode } from "@/lib/hipaa";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

async function getSignedStorageUrl(fileKey: string): Promise<string | null> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const signUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/sign/${bucket}/${fileKey}`;
  const res = await fetch(signUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      apikey: supabaseServiceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
  });

  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as { signedURL?: string; signedUrl?: string } | null;
  const signedPath = body?.signedURL || body?.signedUrl || null;
  if (!signedPath) return null;
  return signedPath.startsWith("http")
    ? signedPath
    : `${supabaseUrl.replace(/\/$/, "")}/storage/v1${signedPath}`;
}

export async function GET(req: Request) {
  try {
    try {
      assertHipaaReady("storage");
    } catch (error) {
      if (isHipaaMode()) {
        return NextResponse.json(hipaaFailureResponse("storage"), { status: 503 });
      }
      throw error;
    }

    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docs = await db.document.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "READ",
        resourceType: "DOCUMENT_LIST",
      },
    });
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        viewUrl: await getSignedStorageUrl(doc.fileKey),
      }))
    );
    return NextResponse.json(docsWithUrls, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("mobile documents GET error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    try {
      assertHipaaReady("storage");
    } catch (error) {
      if (isHipaaMode()) {
        return NextResponse.json(hipaaFailureResponse("storage"), { status: 503 });
      }
      throw error;
    }

    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ipAddress = extractIPAddress(req);

    const hasCoreConsents = await Promise.all([
      latestConsentStatus(user.id, CONSENT_TYPES.termsOfUse),
      latestConsentStatus(user.id, CONSENT_TYPES.privacyPolicy),
      latestConsentStatus(user.id, CONSENT_TYPES.cloudHealthStorage),
    ]);
    if (hasCoreConsents.includes(false)) {
      return NextResponse.json(
        { error: "Please accept the required privacy and storage terms before using document features." },
        { status: 403 }
      );
    }

    const hasUploadConsent = await latestConsentStatus(user.id, CONSENT_TYPES.documentUpload);
    if (!hasUploadConsent) {
      return NextResponse.json(
        { error: "Document upload consent is required before storing files in the vault." },
        { status: 403 }
      );
    }

    const rl = checkRateLimit(`mobile-documents-upload:${user.id}`, 30, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many document uploads. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || "";
    const category = (formData.get("category") as string) || "Other";
    const docDateStr = (formData.get("docDate") as string) || "";
    const tags = (formData.get("tags") as string) || "";
    const clientId = (formData.get("clientId") as string) || "";
    const wantsAnalysis = String(formData.get("enableAnalysis") ?? "").toLowerCase() == "true";
    const previewImageMimeType = String(formData.get("analysisPreviewImageMimeType") ?? "").trim();
    const previewImageBase64 = String(formData.get("analysisPreviewImageBase64") ?? "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 });
    }
    const mimeType = file.type || "application/octet-stream";
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let aiSummary: string | null = null;
    let aiFeedback: string | null = null;

    if (wantsAnalysis) {
      try {
        assertHipaaReady("ai");
      } catch (error) {
        if (isHipaaMode()) {
          return NextResponse.json(hipaaFailureResponse("ai"), { status: 503 });
        }
        throw error;
      }
      const hasAnalysisConsent = await latestConsentStatus(user.id, CONSENT_TYPES.documentAIAnalysis);
      if (!hasAnalysisConsent) {
        return NextResponse.json(
          { error: "AI analysis consent is required before sending a document for automated review." },
          { status: 403 }
        );
      }
      const analysisRl = checkRateLimit(`mobile-documents-analysis:${user.id}`, 10, 15 * 60 * 1000);
      if (!analysisRl.ok) {
        return NextResponse.json(
          { error: "Too many document analyses. Please try again later." },
          { status: 429, headers: { "Retry-After": String(analysisRl.retryAfterSec) } }
        );
      }

      try {
        const analysis = await analyzeDocument({
          mimeType,
          buffer,
          title: title || file.name,
          category: category || "Other",
          previewImageMimeType: previewImageMimeType || undefined,
          previewImageBase64: previewImageBase64 || undefined,
        });
        aiSummary = analysis.aiSummary;
        aiFeedback = analysis.aiFeedback;
      } catch (analysisError) {
        console.error("Mobile document analysis failed:", analysisError);
        aiSummary = "Automated analysis is currently unavailable for this document.";
        aiFeedback = "Informational only. The document was saved successfully, but automated review could not be completed.";
      }
    }

    // Upload to Supabase Storage (server-side)
    const safeName = String(file.name || "upload.bin")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 96);
    const fileKey = `${crypto.randomUUID()}-${safeName}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }
    const storagePath = `documents/${user.id}/${fileKey}`;
    const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storagePath}`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: buffer,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "");
      console.error("Storage upload failed:", uploadRes.status, errText);
      return NextResponse.json({ error: "Storage upload failed" }, { status: 500 });
    }

    const document = await db.document.create({
      data: {
        ...(clientId ? { id: clientId } : {}),
        userId: user.id,
        title: title || file.name,
        fileKey: storagePath,
        mimeType,
        sizeBytes: file.size,
        category: category || "Other",
        docDate: docDateStr ? new Date(docDateStr) : null,
        aiSummary,
        aiFeedback,
        tags: {
          create: (tags || "")
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "")
            .map((t) => ({ tag: t })),
        },
      },
    });

    await db.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: user.id,
        action: wantsAnalysis ? "UPLOAD_ANALYZE" : "UPLOAD",
      },
    });
    await writeAuditLog({
      userId: user.id,
      action: wantsAnalysis ? "CREATE_ANALYZE" : "CREATE",
      resourceType: "DOCUMENT",
      resourceId: document.id,
      details: JSON.stringify({
        category: document.category,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        analyzed: wantsAnalysis,
      }),
      ipAddress,
    });

    return NextResponse.json(document);
  } catch (e) {
    console.error("mobile documents POST error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    try {
      assertHipaaReady("storage");
    } catch (error) {
      if (isHipaaMode()) {
        return NextResponse.json(hipaaFailureResponse("storage"), { status: 503 });
      }
      throw error;
    }

    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const doc = await db.document.findFirst({ where: { id, userId: user.id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseServiceKey) {
      const deleteUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${doc.fileKey}`;
      await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
      }).catch((err) => console.error("mobile storage delete error:", err));
    }

    await db.documentAccessLog.create({
      data: {
        documentId: doc.id,
        userId: user.id,
        action: "DELETE",
      },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        resourceType: "DOCUMENT",
        resourceId: doc.id,
      },
    });
    await db.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("mobile documents DELETE error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
