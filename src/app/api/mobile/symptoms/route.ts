export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { asNumberInRange, asOptionalDate, asOptionalString, asTrimmedString } from "@/lib/request-validators";
import { writeAuditLog } from "@/lib/audit";

const SYMPTOM_TYPES = [
  "PAIN (FLANK/BACK)",
  "FATIGUE",
  "HEMATURIA (BLOOD IN URINE)",
  "SWELLING (EDEMA)",
  "SHORTNESS OF BREATH",
  "UTI SYMPTOMS",
  "OTHER",
] as const;

export async function GET(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.symptomLog.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      take: 2000,
    });
    await writeAuditLog({
      userId: user.id,
      action: "READ",
      resourceType: "SYMPTOM_LIST",
      details: `count=${rows.length}`,
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error("mobile symptoms GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = asTrimmedString(body?.id ?? "", 100);
    const type = asTrimmedString(body?.type ?? "", 100);
    const severity = asNumberInRange(body?.severity, 0, 10);
    const details = asOptionalString(body?.notes, 2000);
    const timestamp = asOptionalDate(body?.timestamp) ?? new Date();

    if (!SYMPTOM_TYPES.includes(type.toUpperCase() as (typeof SYMPTOM_TYPES)[number]) || severity === null) {
      return NextResponse.json({ error: "Invalid symptom type or severity" }, { status: 400 });
    }

    const created = await db.symptomLog.create({
      data: {
        ...(id ? { id } : {}),
        userId: user.id,
        type,
        severity: Math.round(severity),
        details: details ?? null,
        timestamp,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE",
      resourceType: "SYMPTOM",
      resourceId: created.id,
      details: `type=${created.type}; severity=${created.severity}`,
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      try {
        const body = await req.json();
        const id = String(body?.id ?? "").trim();
        if (id) {
          const existing = await db.symptomLog.findFirst({ where: { id } });
          if (existing) return NextResponse.json(existing);
        }
      } catch {}
    }
    console.error("mobile symptoms POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
