import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
]

// CORS: allowed origins for public API (online site calling hoteltheretinue.in)
// Set ALLOWED_ORIGINS with the exact origin(s), e.g.:
// https://hoteltheretinueonline.co.in,https://www.hoteltheretinueonline.co.in (comma-separated)
const getAllowedOrigins = (): string[] => {
  const env = process.env.ALLOWED_ORIGINS || ''
  if (!env.trim()) return []
  return env.split(',').map((o) => o.trim()).filter(Boolean)
}

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowed = getAllowedOrigins()
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || '*')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CORS for public API (online site integration)
  if (pathname.startsWith('/api/public')) {
    const cors = getCorsHeaders(request)
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: cors })
    }
    const res = NextResponse.next()
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Note: JWT verification is handled in API routes via requireAuth()
  // Middleware runs on Edge Runtime which doesn't support jsonwebtoken
  // API routes use Node.js runtime and can properly verify JWT tokens
  
  // For page routes, client-side auth check is done in components
  // API routes will handle authentication via requireAuth() helper
  return NextResponse.next()
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
