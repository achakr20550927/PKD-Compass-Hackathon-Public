export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { analyzeDocument } from "@/lib/document-analysis";
import { CONSENT_TYPES, extractIPAddress, latestConsentStatus } from "@/lib/consents";
import { writeAuditLog } from "@/lib/audit";
import { assertHipaaReady, hipaaFailureResponse, isHipaaMode } from "@/lib/hipaa";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

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

async function downloadFromStorage(fileKey: string): Promise<Buffer | null> {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const objectUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${fileKey}`;
  const res = await fetch(objectUrl, {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      apikey: supabaseServiceKey,
    },
  });
  if (!res.ok) return null;
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

function needsReanalysis(summary: string | null | undefined): boolean {
  if (!summary) return true;
  return summary.startsWith("Analysis unavailable for this PDF because readable text could not be extracted.");
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    const { id } = await context.params;

    const document = await db.document.findFirst({
      where: { id, userId: user.id },
      include: {
        tags: true,
        links: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await db.documentAccessLog.create({
      data: {
        documentId: document.id,
        userId: user.id,
        action: "VIEW",
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "READ",
      resourceType: "DOCUMENT",
      resourceId: document.id,
      details: JSON.stringify({ viewedDetail: true }),
      ipAddress,
    });

    let resolvedDocument = document;
    const shouldAttemptAnalysis = needsReanalysis(document.aiSummary);
    if (shouldAttemptAnalysis && (await latestConsentStatus(user.id, CONSENT_TYPES.documentAIAnalysis))) {
      try {
        assertHipaaReady("ai");
      } catch (error) {
        if (isHipaaMode()) {
          return NextResponse.json(hipaaFailureResponse("ai"), { status: 503 });
        }
        throw error;
      }
      const buffer = await downloadFromStorage(document.fileKey);
      if (buffer) {
        try {
          const analysis = await analyzeDocument({
            mimeType: document.mimeType,
            buffer,
            title: document.title,
            category: document.category,
          });
          resolvedDocument = await db.document.update({
            where: { id: document.id },
            data: {
              aiSummary: analysis.aiSummary,
              aiFeedback: analysis.aiFeedback,
            },
            include: {
              tags: true,
              links: true,
            },
          });
        } catch (error) {
          console.error("Mobile document re-analysis failed:", error);
        }
      }
    }

    const viewUrl = await getSignedStorageUrl(resolvedDocument.fileKey);
    return NextResponse.json(
      { ...resolvedDocument, viewUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("mobile document detail GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
