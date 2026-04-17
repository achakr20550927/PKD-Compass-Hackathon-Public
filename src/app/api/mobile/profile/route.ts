export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { asNumberInRange, asOptionalDate, asOptionalString, asTrimmedString } from "@/lib/request-validators";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const row = await db.profile.findUnique({ where: { userId: user.id } });
    await writeAuditLog({
      userId: user.id,
      action: "READ",
      resourceType: "PROFILE",
      resourceId: row?.userId ?? user.id,
    });
    return NextResponse.json(row || null);
  } catch (e) {
    console.error("mobile profile GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getMobileUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = checkRateLimit(`mobile-profile-patch:${user.id}`, 40, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many profile update attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const data: any = {};

    // Basic
    if (body.firstName !== undefined) data.firstName = asOptionalString(body.firstName, 80);
    if (body.lastName !== undefined) data.lastName = asOptionalString(body.lastName, 80);
    if (body.dob !== undefined) data.dob = asOptionalDate(body.dob);
    if (body.sexAtBirth !== undefined) {
      const sex = asTrimmedString(body.sexAtBirth, 16).toUpperCase();
      if (sex && sex !== "MALE" && sex !== "FEMALE") {
        return NextResponse.json({ error: "Invalid sexAtBirth value" }, { status: 400 });
      }
      data.sexAtBirth = sex || null;
    }
    if (body.phone !== undefined) data.phone = asOptionalString(body.phone, 40);
    if (body.zipCode !== undefined) data.zipCode = asOptionalString(body.zipCode, 20);

    // Clinical
    if (body.heightCm !== undefined) {
      if (body.heightCm === null || body.heightCm === "") data.heightCm = null;
      else {
        const v = asNumberInRange(body.heightCm, 30, 300);
        if (v === null) return NextResponse.json({ error: "Invalid height range" }, { status: 400 });
        data.heightCm = v;
      }
    }
    if (body.weightKg !== undefined) {
      if (body.weightKg === null || body.weightKg === "") data.weightKg = null;
      else {
        const v = asNumberInRange(body.weightKg, 1, 700);
        if (v === null) return NextResponse.json({ error: "Invalid weight range" }, { status: 400 });
        data.weightKg = v;
      }
    }
    if (body.hasDiabetes !== undefined) data.hasDiabetes = !!body.hasDiabetes;
    if (body.hasHypertension !== undefined) data.hasHypertension = !!body.hasHypertension;

    const updated = await db.profile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    await writeAuditLog({
      userId: user.id,
      action: "UPDATE",
      resourceType: "PROFILE",
      resourceId: updated.userId,
      details: `fields=${Object.keys(data).sort().join(",")}`,
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("mobile profile PATCH error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
