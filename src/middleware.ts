import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const PAGE_PROTECTED_PREFIXES = [
  "/dashboard",
  "/labs",
  "/meds",
  "/log",
  "/bp",
  "/symptoms",
  "/education",
  "/settings",
  "/profile",
  "/notifications",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizedEnvOrigins(): string[] {
  const rawOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const normalized = rawOrigins
    .map((v) => originFromHeader(v))
    .filter((v): v is string => Boolean(v));

  const nextAuthUrl = originFromHeader((process.env.NEXTAUTH_URL ?? "").trim());
  if (nextAuthUrl) normalized.push(nextAuthUrl);
  return Array.from(new Set(normalized));
}

function isAllowedOrigin(req: NextRequest, requestOrigin: string | null): boolean {
  if (!requestOrigin) return false;
  const sameHost = requestOrigin === req.nextUrl.origin;
  if (sameHost) return true;
  return normalizedEnvOrigins().includes(requestOrigin);
}

function attachCorsHeaders(req: NextRequest, response: NextResponse): NextResponse {
  const origin = req.headers.get("origin");
  const requestOrigin = originFromHeader(origin);

  if (requestOrigin && isAllowedOrigin(req, requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Seed-Secret");
    response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (req.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  return response;
}

function shouldApplyCsrfCheck(req: NextRequest): boolean {
  if (!MUTATING_METHODS.has(req.method)) return false;
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/mobile/")) return false;
  if (path.startsWith("/api/auth/")) return false;

  const hasSessionCookie = Boolean(req.headers.get("cookie"));
  const hasBearer = (req.headers.get("authorization") ?? "").toLowerCase().startsWith("bearer ");
  return hasSessionCookie && !hasBearer;
}

function requiresJsonBody(req: NextRequest): boolean {
  if (!MUTATING_METHODS.has(req.method)) return false;
  if (req.method === "DELETE") return false;
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/documents")) return false;
  if (path.startsWith("/api/mobile/documents")) return false;
  if (path.startsWith("/api/auth/")) return false;
  return true;
}

function handleApiSecurity(req: NextRequest): NextResponse {
  if (req.method === "OPTIONS") {
    return attachCorsHeaders(req, new NextResponse(null, { status: 204 }));
  }

  const requestOrigin = originFromHeader(req.headers.get("origin"));
  if (requestOrigin && !isAllowedOrigin(req, requestOrigin)) {
    return attachCorsHeaders(
      req,
      NextResponse.json({ error: "Origin not allowed." }, { status: 403 })
    );
  }

  if (shouldApplyCsrfCheck(req)) {
    const origin = requestOrigin ?? originFromHeader(req.headers.get("referer"));
    if (!isAllowedOrigin(req, origin)) {
      return attachCorsHeaders(
        req,
        NextResponse.json({ error: "CSRF validation failed." }, { status: 403 })
      );
    }
  }

  if (requiresJsonBody(req)) {
    const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("application/json")) {
      return attachCorsHeaders(
        req,
        NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 })
      );
    }
  }

  return attachCorsHeaders(req, NextResponse.next());
}

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return handleApiSecurity(req);
  }

  const isProtectedPage = PAGE_PROTECTED_PREFIXES.some(
    (prefix) => req.nextUrl.pathname === prefix || req.nextUrl.pathname.startsWith(`${prefix}/`)
  );

  if (isProtectedPage) {
    return authMiddleware(req as any, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/labs/:path*", "/meds/:path*", "/log/:path*", "/bp/:path*", "/symptoms/:path*", "/education/:path*", "/settings/:path*", "/profile/:path*", "/notifications/:path*"],
};
