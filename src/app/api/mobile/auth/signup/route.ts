export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createMobileSession,
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "@/lib/mobile-auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);
    const rl = checkRateLimit(`mobile-signup:${ip}`, 12, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const firstName = String(body?.firstName ?? "").trim();
    const lastName = String(body?.lastName ?? "").trim();
    const sexAtBirth = String(body?.sexAtBirth ?? "").trim().toUpperCase();
    const email = normalizeEmail(body?.email ?? "");
    const password = String(body?.password ?? "");

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Missing first or last name" }, { status: 400 });
    }
    if (sexAtBirth && !["MALE", "FEMALE"].includes(sexAtBirth)) {
      return NextResponse.json({ error: "Invalid sexAtBirth value" }, { status: 400 });
    }
    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Weak password (8+ chars, upper, lower, number, symbol)." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        email,
        name: `${firstName} ${lastName}`,
        gender: sexAtBirth || null,
        passwordHash: await hashPassword(password),
        role: "PATIENT",
        profile: {
          create: {
            firstName,
            lastName,
            sexAtBirth: sexAtBirth || null,
          },
        },
      },
      include: { profile: true },
    });

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
    console.error("mobile signup error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
