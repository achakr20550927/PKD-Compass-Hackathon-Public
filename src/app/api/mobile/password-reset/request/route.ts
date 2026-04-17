export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import { isValidEmail, normalizeEmail, randomToken, sha256Hex } from "@/lib/mobile-auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";
import { assertHipaaReady, hipaaFailureResponse, isHipaaMode } from "@/lib/hipaa";

export async function POST(req: Request) {
  try {
    try {
      assertHipaaReady("email");
    } catch (error) {
      if (isHipaaMode()) {
        return NextResponse.json(hipaaFailureResponse("email"), { status: 503 });
      }
      throw error;
    }

    const ip = clientIpFromRequest(req);
    const rl = checkRateLimit(`mobile-password-reset:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { success: true },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: true });
    }
    const email = normalizeEmail(body?.email ?? "");
    if (!email || !isValidEmail(email)) {
      // Generic response to avoid enumeration
      return NextResponse.json({ success: true });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const rawToken = randomToken(32);
    const tokenHash = sha256Hex(rawToken);
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Remove any old tokens for this identifier to keep the table tidy.
    await db.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => {});

    await db.verificationToken.create({
      data: { identifier: email, token: tokenHash, expires },
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${appUrl.replace(/\/$/, "")}/reset-password?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(rawToken)}`;

    const from = process.env.VERIFICATION_FROM_EMAIL || "noreply@example.com";
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY missing; cannot send reset email");
      return NextResponse.json({ success: true });
    }

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from,
      to: email,
      subject: "Reset your PKD Compass password",
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
          <h2>Reset your PKD Compass password</h2>
          <p>We received a request to reset your password. If you did not request this, you can ignore this email.</p>
          <p><a href="${resetLink}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#4F7CFF;color:#fff;text-decoration:none;">Reset Password</a></p>
          <p style="color:#6b7280;font-size:12px;">This link expires in 1 hour.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("mobile reset request error:", e);
    return NextResponse.json({ success: true });
  }
}
