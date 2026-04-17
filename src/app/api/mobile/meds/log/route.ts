export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { asOptionalDate, asTrimmedString } from "@/lib/request-validators";

const MED_LOG_STATUS = ["TAKEN", "MISSED", "PENDING"] as const;

export async function POST(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const medicationId = asTrimmedString(body?.medicationId ?? "", 100);
    const status = asTrimmedString(body?.status ?? "", 20).toUpperCase();
    const timestamp = asOptionalDate(body?.timestamp) ?? new Date();

    if (!medicationId || !MED_LOG_STATUS.includes(status as (typeof MED_LOG_STATUS)[number])) {
      return NextResponse.json({ error: "Invalid medicationId or status" }, { status: 400 });
    }

    const med = await db.medication.findFirst({
      where: { id: medicationId, userId: user.id },
    });
    if (!med) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    const log = await db.medLog.create({
      data: {
        medId: med.id,
        scheduledAt: timestamp,
        status,
      },
    });

    return NextResponse.json(log);
  } catch (e) {
    console.error("mobile meds log error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
