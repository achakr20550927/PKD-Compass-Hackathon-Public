export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { asOptionalDate, asOptionalString, asTrimmedString } from "@/lib/request-validators";
import { writeAuditLog } from "@/lib/audit";

const MED_FREQUENCIES = ["DAILY", "BID", "TID", "QID", "WEEKLY", "CUSTOM"] as const;

export async function GET(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const meds = await db.medication.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });

    const payload = [];
    for (const m of meds) {
      const latest = await db.medLog.findFirst({
        where: { medId: m.id },
        orderBy: { scheduledAt: "desc" },
      });
      payload.push({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        isActive: m.isActive,
        isTolvaptan: m.isTolvaptan,
        startDate: m.startDate,
        instructions: m.instructions,
        latestStatus: latest?.status ?? null,
        latestStatusAt: latest?.scheduledAt ?? null,
      });
    }

    await writeAuditLog({
      userId: user.id,
      action: "READ",
      resourceType: "MEDICATION_LIST",
      details: `count=${payload.length}`,
    });

    return NextResponse.json(payload);
  } catch (e) {
    console.error("mobile meds GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = asTrimmedString(body?.id ?? "", 100);
    const name = asTrimmedString(body?.name ?? "", 150);
    const dosage = asTrimmedString(body?.dosage ?? "", 80);
    const frequency = asTrimmedString(body?.frequency ?? "", 20).toUpperCase();
    const isTolvaptan = !!body?.isTolvaptan;
    const instructions = asOptionalString(body?.instructions, 500);
    const startDate = asOptionalDate(body?.startDate) ?? new Date();

    if (!name || !dosage || !MED_FREQUENCIES.includes(frequency as (typeof MED_FREQUENCIES)[number])) {
      return NextResponse.json({ error: "Invalid medication fields" }, { status: 400 });
    }

    const created = await db.medication.create({
      data: {
        ...(id ? { id } : {}),
        userId: user.id,
        name,
        dosage,
        frequency,
        instructions,
        startDate,
        isTolvaptan,
        isActive: true,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE",
      resourceType: "MEDICATION",
      resourceId: created.id,
      details: `name=${created.name}; dosage=${created.dosage}; frequency=${created.frequency}`,
    });

    return NextResponse.json(created);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      try {
        const body = await req.json();
        const id = String(body?.id ?? "").trim();
        if (id) {
          const existing = await db.medication.findFirst({ where: { id } });
          if (existing) return NextResponse.json(existing);
        }
      } catch {}
    }
    console.error("mobile meds POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = asTrimmedString(searchParams.get("id") ?? "", 100);
    if (!id) {
      return NextResponse.json({ error: "Missing medication id" }, { status: 400 });
    }

    const existing = await db.medication.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Medication not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.medLog.deleteMany({ where: { medId: id } });
      await tx.medication.delete({ where: { id } });
    });

    await writeAuditLog({
      userId: user.id,
      action: "DELETE",
      resourceType: "MEDICATION",
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("mobile meds DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
