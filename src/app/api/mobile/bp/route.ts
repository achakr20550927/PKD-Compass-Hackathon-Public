export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { asNumberInRange, asOptionalDate, asTrimmedString } from "@/lib/request-validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db.bloodPressureLog.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
      take: 2000,
    });

    await writeAuditLog({
      userId: user.id,
      action: "READ",
      resourceType: "BP_LIST",
      details: `count=${rows.length}`,
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error("mobile bp GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let currentUserId: string | null = null;
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    currentUserId = user.id;

    const body = await req.json();
    const id = asTrimmedString(body?.id ?? "", 100);
    const systolic = asNumberInRange(body?.systolic, 40, 300);
    const diastolic = asNumberInRange(body?.diastolic, 30, 200);
    const heartRate = body?.heartRate === null || body?.heartRate === undefined
      ? null
      : asNumberInRange(body.heartRate, 20, 260);
    const timestamp = asOptionalDate(body?.timestamp) ?? new Date();

    if (systolic === null || diastolic === null) {
      return NextResponse.json({ error: "Invalid systolic/diastolic range" }, { status: 400 });
    }

    const created = await db.bloodPressureLog.create({
      data: {
        ...(id ? { id } : {}),
        userId: user.id,
        systolic: Math.round(systolic),
        diastolic: Math.round(diastolic),
        heartRate: heartRate !== null ? Math.round(heartRate) : null,
        timestamp,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE",
      resourceType: "BP_READING",
      resourceId: created.id,
      details: `systolic=${created.systolic}; diastolic=${created.diastolic}; heartRate=${created.heartRate ?? ""}`,
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      try {
        const body = await req.json();
        const id = String(body?.id ?? "").trim();
        if (id && currentUserId) {
          const existing = await db.bloodPressureLog.findFirst({ where: { id, userId: currentUserId } });
          if (existing) return NextResponse.json(existing);
        }
      } catch {}
    }
    console.error("mobile bp POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
