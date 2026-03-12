import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
];

const CSRF_COOKIE = "csrfToken";
const CSRF_HEADER = "x-csrf-token";

// CORS: allowed origins for public API (online site calling hoteltheretinue.in)
// Set ALLOWED_ORIGINS with the exact origin(s), e.g.:
// https://hoteltheretinueonline.co.in,https://www.hoteltheretinueonline.co.in (comma-separated)
const getAllowedOrigins = (): string[] => {
  const env = process.env.ALLOWED_ORIGINS || "";
  if (!env.trim()) return [];
  return env
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
};

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: data: blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing) return;
  const token = crypto.randomUUID().replace(/-/g, "");
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

function isStateChangingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function shouldSkipCsrf(pathname: string) {
  if (!pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/api/public")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/refresh")) return true;
  if (pathname.startsWith("/api/auth/forgot-password")) return true;
  if (pathname.startsWith("/api/auth/reset-password")) return true;
  if (pathname.startsWith("/api/admin/auto-cleanup")) return true;
  return false;
}

function isValidCsrf(request: NextRequest) {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Redirect www.hoteltheretinue.in to hoteltheretinue.in (Apex domain)
  // This helps with SSL consistency if the certificate is only for the apex domain
  if (hostname === "www.hoteltheretinue.in") {
    const url = request.nextUrl.clone();
    url.host = "hoteltheretinue.in";
    return NextResponse.redirect(url, 301);
  }

  if (isStateChangingMethod(request.method) && !shouldSkipCsrf(pathname)) {
    if (!isValidCsrf(request)) {
      const response = NextResponse.json(
        { success: false, error: "CSRF validation failed", code: "FORBIDDEN" },
        { status: 403 },
      );
      applySecurityHeaders(response);
      return response;
    }
  }

  // CORS for public API (online site integration)
  if (pathname.startsWith("/api/public")) {
    const cors = getCorsHeaders(request);
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204, headers: cors });
      applySecurityHeaders(response);
      return response;
    }
    const res = NextResponse.next();
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    ensureCsrfCookie(request, res);
    applySecurityHeaders(res);
    return res;
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    const response = NextResponse.next();
    ensureCsrfCookie(request, response);
    applySecurityHeaders(response);
    return response;
  }

  // Note: JWT verification is handled in API routes via requireAuth()
  // Middleware runs on Edge Runtime which doesn't support jsonwebtoken
  // API routes use Node.js runtime and can properly verify JWT tokens

  // For page routes, client-side auth check is done in components
  // API routes will handle authentication via requireAuth() helper
  const response = NextResponse.next();
  ensureCsrfCookie(request, response);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
