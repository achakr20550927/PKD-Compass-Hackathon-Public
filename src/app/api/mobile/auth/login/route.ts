export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createMobileSession,
  isValidEmail,
  normalizeEmail,
  verifyPassword,
} from "@/lib/mobile-auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const rl = checkRateLimit(`mobile-login:${ip}`, 30, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const email = normalizeEmail(body?.email ?? "");
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Best-effort cleanup of expired sessions
    await db.session
      .deleteMany({ where: { userId: user.id, expires: { lt: new Date() } } })
      .catch(() => {});

    const sessionToken = await createMobileSession(user.id);

    return NextResponse.json({
      sessionToken,
      user: {
        id: user.id,
        email: user.email!,
        firstName: user.profile?.firstName ?? null,
        lastName: user.profile?.lastName ?? null,
      },
    });
  } catch (e) {
    console.error("mobile login error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
