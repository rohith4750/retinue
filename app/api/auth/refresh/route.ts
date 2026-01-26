import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { verifyRefreshToken, generateTokenPair } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// Use Node.js runtime (required for jsonwebtoken)
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (!refreshToken) {
      return Response.json(
        errorResponse('Unauthorized', 'Refresh token not found'),
        { status: 401 }
      )
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      // Clear invalid refresh token
      cookieStore.delete('refreshToken')
      return Response.json(
        errorResponse('Unauthorized', 'Invalid or expired refresh token'),
        { status: 401 }
      )
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true },
    })

    if (!user) {
      cookieStore.delete('refreshToken')
      return Response.json(
        errorResponse('Unauthorized', 'User not found'),
        { status: 401 }
      )
    }

    // Generate new token pair (token rotation)
    const newTokenPair = generateTokenPair({
      userId: user.id,
      role: user.role,
      username: user.username,
    })

    // Update refresh token cookie
    cookieStore.set('refreshToken', newTokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return Response.json(
      successResponse(
        {
          accessToken: newTokenPair.accessToken,
        },
        'Token refreshed successfully'
      )
    )
  } catch (error: any) {
    console.error('Refresh token error:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to refresh token'),
      { status: 500 }
    )
  }
}
