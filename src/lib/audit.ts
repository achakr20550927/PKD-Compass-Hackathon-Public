import { db } from "@/lib/db";

type AuditWrite = {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
};

export async function writeAuditLog(entry: AuditWrite) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        details: entry.details ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("audit log write failed:", error);
  }
}
