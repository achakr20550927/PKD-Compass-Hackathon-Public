export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeDocument } from '@/lib/document-analysis';
import { CONSENT_TYPES, latestConsentStatus } from '@/lib/consents';
import { assertHipaaReady, hipaaFailureResponse, isHipaaMode } from '@/lib/hipaa';

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
    const body = await res.json().catch(() => null) as any;
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

async function deleteFromStorage(fileKey: string): Promise<void> {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return;

    const deleteUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${fileKey}`;
    await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
        },
    }).catch((err) => console.error("Storage delete error:", err));
}

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
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
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;
        const { id } = await context.params;

        const document = await db.document.findUnique({
            where: { id, userId },
            include: {
                tags: true,
                links: true
            }
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Log the view
        await db.documentAccessLog.create({
            data: {
                documentId: id,
                userId,
                action: 'VIEW'
            }
        });

        let resolvedDocument = document;
        const shouldAttemptAnalysis = needsReanalysis(document.aiSummary);
        if (shouldAttemptAnalysis) {
            const hasAnalysisConsent = await latestConsentStatus(userId, CONSENT_TYPES.documentAIAnalysis);
            if (hasAnalysisConsent) {
                try {
                    assertHipaaReady('ai');
                } catch (error) {
                    if (isHipaaMode()) {
                        return NextResponse.json(hipaaFailureResponse('ai'), { status: 503 });
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
                        console.error("Document re-analysis failed:", error);
                    }
                }
            }
        }

        const viewUrl = await getSignedStorageUrl(resolvedDocument.fileKey);

        return NextResponse.json(
            { ...resolvedDocument, viewUrl },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    } catch (error) {
        console.error('Get document detail error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
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
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = session.user.id;
        const { id } = await context.params;

        const document = await db.document.findUnique({
            where: { id, userId }
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        await deleteFromStorage(document.fileKey);

        // Log the deletion first (while the document exists for foreign key constraints)
        await db.documentAccessLog.create({
            data: {
                documentId: id,
                userId,
                action: 'DELETE'
            }
        });

        await db.document.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
