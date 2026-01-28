import { NextRequest } from 'next/server'
import { requireAuth, successResponse, errorResponse } from '@/lib/api-helpers'

/**
 * Token validation endpoint
 * GET /api/auth/validate
 * Returns user info if token is valid, 401 if invalid
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    // Token is valid - return user info
    return Response.json(
      successResponse({
        valid: true,
        userId: (authResult as any).userId,
        role: (authResult as any).role,
      })
    )
  } catch (error) {
    console.error('Token validation error:', error)
    return Response.json(
      errorResponse('UNAUTHORIZED', 'Invalid or expired token'),
      { status: 401 }
    )
  }
}
