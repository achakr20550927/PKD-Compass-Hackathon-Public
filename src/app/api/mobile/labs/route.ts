export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { asNumberInRange, asOptionalDate, asTrimmedString } from "@/lib/request-validators";
import { writeAuditLog } from "@/lib/audit";

const LAB_TYPES = ["EGFR", "SERUM_CREATININE", "POTASSIUM", "SODIUM", "PHOSPHORUS", "BUN", "UACR"] as const;

export async function GET(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "").toUpperCase();

    const rows = await db.observation.findMany({
      where: {
        userId: user.id,
        ...(type ? { type } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: 2000,
    });

    await writeAuditLog({
      userId: user.id,
      action: "READ",
      resourceType: "LAB_LIST",
      details: type ? `type=${type}; count=${rows.length}` : `count=${rows.length}`,
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error("mobile labs GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = asTrimmedString(body?.id ?? "", 100);
    const type = asTrimmedString(body?.type ?? "", 64).toUpperCase();
    const value = asNumberInRange(body?.value, 0, 100000);
    const unit = asTrimmedString(body?.unit ?? "", 50);
    const timestamp = asOptionalDate(body?.timestamp) ?? new Date();

    if (!LAB_TYPES.includes(type as (typeof LAB_TYPES)[number]) || value === null) {
      return NextResponse.json({ error: "Invalid lab type or value" }, { status: 400 });
    }

    const created = await db.observation.create({
      data: {
        ...(id ? { id } : {}),
        userId: user.id,
        type,
        value,
        unit,
        timestamp,
        source: "MANUAL",
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "CREATE",
      resourceType: "LAB",
      resourceId: created.id,
      details: `type=${created.type}; value=${created.value}; unit=${created.unit ?? ""}`,
    });

    return NextResponse.json(created);
  } catch (e: any) {
    // If client re-sends the same UUID, treat it as idempotent and return the existing row.
    const msg = String(e?.message ?? "");
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      try {
        const body = await req.json();
        const id = String(body?.id ?? "").trim();
        if (id) {
          const existing = await db.observation.findFirst({ where: { id } });
          if (existing) return NextResponse.json(existing);
        }
      } catch {}
    }
    console.error("mobile labs POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
