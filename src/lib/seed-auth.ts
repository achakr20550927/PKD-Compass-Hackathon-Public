import crypto from "crypto";

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function hasSeedAccess(req: Request, envKey: string): boolean {
  // Seed/import endpoints must not run in production runtime.
  // Use non-production environments for provisioning and dataset generation.
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const expected = process.env[envKey];
  const provided = req.headers.get("x-seed-secret") ?? "";
  if (!expected || !provided) return false;
  return timingSafeEqualString(expected, provided);
}
