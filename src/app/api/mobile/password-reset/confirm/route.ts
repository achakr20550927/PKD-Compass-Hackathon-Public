export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, isValidEmail, isValidPassword, normalizeEmail, sha256Hex } from "@/lib/mobile-auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const rl = checkRateLimit(`mobile-password-reset-confirm:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const email = normalizeEmail(body?.email ?? "");
    const token = String(body?.token ?? "");
    const newPassword = String(body?.newPassword ?? "");

    if (!email || !token) {
      return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: "Weak password (8+ chars, upper, lower, number, symbol)." },
        { status: 400 }
      );
    }

    const tokenHash = sha256Hex(token);
    const record = await db.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token: tokenHash } },
    });
    if (!record || record.expires.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      await db.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => {});
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await db.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("mobile reset confirm error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
