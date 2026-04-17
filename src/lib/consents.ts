import { db } from "@/lib/db";

export const CONSENT_TYPES = {
  termsOfUse: "TERMS_OF_USE",
  privacyPolicy: "PRIVACY_POLICY",
  cloudHealthStorage: "CLOUD_HEALTH_STORAGE",
  bloodPressure: "BLOOD_PRESSURE",
  labsAndSymptoms: "LABS_AND_SYMPTOMS",
  medications: "MEDICATIONS",
  careOrganizer: "CARE_ORGANIZER",
  documentUpload: "DOCUMENT_UPLOAD",
  documentAIAnalysis: "DOCUMENT_AI_ANALYSIS",
  reportExports: "REPORT_EXPORTS",
  notifications: "NOTIFICATIONS",
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

export async function latestConsentStatus(userId: string, type: ConsentType): Promise<boolean> {
  const latest = await db.consent.findFirst({
    where: { userId, type },
    orderBy: { timestamp: "desc" },
  });
  return latest?.status === true;
}

export async function latestConsentMap(userId: string): Promise<Record<string, boolean>> {
  const rows = await db.consent.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
  });

  const map: Record<string, boolean> = {};
  for (const row of rows) {
    if (!(row.type in map)) {
      map[row.type] = row.status;
    }
  }

  return map;
}

export async function recordConsent(params: {
  userId: string;
  type: ConsentType;
  status: boolean;
  ipAddress?: string | null;
}) {
  return db.consent.create({
    data: {
      userId: params.userId,
      type: params.type,
      status: params.status,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

export async function recordConsentBatch(params: {
  userId: string;
  entries: Array<{ type: ConsentType; status: boolean }>;
  ipAddress?: string | null;
}) {
  if (params.entries.length == 0) return;
  await db.consent.createMany({
    data: params.entries.map((entry) => ({
      userId: params.userId,
      type: entry.type,
      status: entry.status,
      ipAddress: params.ipAddress ?? null,
    })),
  });
}

export function extractIPAddress(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return req.headers.get("x-real-ip");
}
