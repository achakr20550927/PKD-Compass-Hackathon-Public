export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { CONSENT_TYPES, extractIPAddress, latestConsentStatus } from '@/lib/consents';
import { analyzeDocument } from '@/lib/document-analysis';
import { writeAuditLog } from '@/lib/audit';
import { assertHipaaReady, hipaaFailureResponse, isHipaaMode } from '@/lib/hipaa';

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;

        const docs = await db.document.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        await db.auditLog.create({
            data: {
                userId,
                action: 'READ',
                resourceType: 'DOCUMENT_LIST',
            }
        });
        return NextResponse.json(docs);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        try {
            assertHipaaReady('storage');
        } catch (error) {
            if (isHipaaMode()) {
                return NextResponse.json(hipaaFailureResponse('storage'), { status: 503 });
            }
            throw error;
        }

        const session = await getServerSession(authOptions as any) as any;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = session.user.id;
        const ipAddress = extractIPAddress(req);

        const [hasTerms, hasPrivacy, hasStorageConsent, hasUploadConsent] = await Promise.all([
            latestConsentStatus(userId, CONSENT_TYPES.termsOfUse),
            latestConsentStatus(userId, CONSENT_TYPES.privacyPolicy),
            latestConsentStatus(userId, CONSENT_TYPES.cloudHealthStorage),
            latestConsentStatus(userId, CONSENT_TYPES.documentUpload),
        ]);
        if (!hasTerms || !hasPrivacy || !hasStorageConsent) {
            return NextResponse.json(
                { error: "Please accept the required privacy and storage terms before using document features." },
                { status: 403 }
            );
        }
        if (!hasUploadConsent) {
            return NextResponse.json(
                { error: "Document upload consent is required before storing files in the vault." },
                { status: 403 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const category = formData.get('category') as string;
        const docDateStr = formData.get('docDate') as string;
        const tags = formData.get('tags') as string;
        const wantsAnalysis = String(formData.get("enableAnalysis") ?? "").toLowerCase() === "true";
        const previewImageMimeType = String(formData.get("analysisPreviewImageMimeType") ?? "").trim();
        const previewImageBase64 = String(formData.get("analysisPreviewImageBase64") ?? "").trim();

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 413 });
        }
        const mimeType = file.type || "application/octet-stream";
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        let aiSummary: string | null = null;
        let aiFeedback: string | null = null;

        if (wantsAnalysis) {
            try {
                assertHipaaReady('ai');
            } catch (error) {
                if (isHipaaMode()) {
                    return NextResponse.json(hipaaFailureResponse('ai'), { status: 503 });
                }
                throw error;
            }
            const hasAnalysisConsent = await latestConsentStatus(userId, CONSENT_TYPES.documentAIAnalysis);
            if (!hasAnalysisConsent) {
                return NextResponse.json(
                    { error: "AI analysis consent is required before sending a document for automated review." },
                    { status: 403 }
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
                console.error("Document analysis failed:", analysisError);
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
        const storagePath = `documents/${userId}/${fileKey}`;
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

        // Create Database Record
        const document = await db.document.create({
            data: {
                userId,
                title: title || file.name,
                fileKey: storagePath,
                mimeType,
                sizeBytes: file.size,
                category: category || 'Other',
                docDate: docDateStr ? new Date(docDateStr) : null,
                aiSummary,
                aiFeedback,
                tags: {
                    create: (tags || "").split(',').map(t => t.trim()).filter(t => t !== "").map(t => ({
                        tag: t
                    }))
                }
            }
        });

        // Log Access
        await db.documentAccessLog.create({
            data: {
                documentId: document.id,
                userId,
                action: 'UPLOAD'
            }
        });
        await db.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                resourceType: 'DOCUMENT',
                resourceId: document.id,
                details: JSON.stringify({
                    category: document.category,
                    mimeType: document.mimeType,
                    sizeBytes: document.sizeBytes
                })
            }
        });
        await writeAuditLog({
            userId,
            action: 'CREATE',
            resourceType: wantsAnalysis ? 'DOCUMENT_ANALYZED' : 'DOCUMENT',
            resourceId: document.id,
            details: JSON.stringify({
                category: document.category,
                mimeType: document.mimeType,
                sizeBytes: document.sizeBytes,
                aiAnalysis: wantsAnalysis
            }),
            ipAddress,
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error('Document upload error:', error);
        const message = error instanceof Error && error.message
            ? error.message
            : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
