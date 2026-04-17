import { db } from '@/lib/db';

type ImportJobStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type ImportJobState = {
    key: string;
    kind: string;
    status: ImportJobStatus;
    cursor?: Record<string, any>;
    metrics?: Record<string, any>;
    message?: string;
    updatedAt: string;
};

export async function getImportJob(key: string): Promise<ImportJobState | null> {
    const record = await db.auditLog.findFirst({
        where: {
            resourceType: 'IMPORT_JOB',
            resourceId: key
        },
        orderBy: { timestamp: 'desc' }
    });

    if (!record?.details) return null;
    try {
        const parsed = JSON.parse(record.details);
        return {
            key,
            kind: parsed.kind || 'unknown',
            status: parsed.status || 'RUNNING',
            cursor: parsed.cursor || {},
            metrics: parsed.metrics || {},
            message: parsed.message,
            updatedAt: record.timestamp.toISOString()
        };
    } catch {
        return null;
    }
}

export async function setImportJob(
    key: string,
    payload: Omit<ImportJobState, 'key' | 'updatedAt'>
) {
    const latest = await db.auditLog.findFirst({
        where: {
            resourceType: 'IMPORT_JOB',
            resourceId: key
        },
        orderBy: { timestamp: 'desc' },
        select: { id: true }
    });

    const details = JSON.stringify({
        kind: payload.kind,
        status: payload.status,
        cursor: payload.cursor || {},
        metrics: payload.metrics || {},
        message: payload.message || null
    });

    if (latest?.id) {
        await db.auditLog.update({
            where: { id: latest.id },
            data: {
                action: 'IMPORT_JOB_UPSERT',
                details,
                timestamp: new Date()
            }
        });
        return;
    }

    await db.auditLog.create({
        data: {
            action: 'IMPORT_JOB_UPSERT',
            resourceType: 'IMPORT_JOB',
            resourceId: key,
            details
        }
    });
}
