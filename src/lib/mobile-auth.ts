import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export type MobileSessionUser = {
  id: string;
  email: string;
  profile: {
    firstName: string | null;
    lastName: string | null;
    sexAtBirth: string | null;
  } | null;
};

export function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  const s = String(password ?? "");
  if (s.length < 8 || s.length > 128) return false;
  const hasUpper = /[A-Z]/.test(s);
  const hasLower = /[a-z]/.test(s);
  const hasDigit = /[0-9]/.test(s);
  const hasSymbol = /[^A-Za-z0-9]/.test(s);
  return hasUpper && hasLower && hasDigit && hasSymbol;
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createMobileSession(userId: string): Promise<string> {
  const sessionToken = randomToken(32);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });
  return sessionToken;
}

export async function getMobileUserFromRequest(req: Request): Promise<MobileSessionUser | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { sessionToken: token },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expires.getTime() <= Date.now()) {
    await db.session.delete({ where: { sessionToken: token } }).catch(() => {});
    return null;
  }

  const user = session.user;
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    profile: user.profile
      ? {
          firstName: user.profile.firstName ?? null,
          lastName: user.profile.lastName ?? null,
          sexAtBirth: (user.profile as any).sexAtBirth ?? null,
        }
      : null,
  };
}
