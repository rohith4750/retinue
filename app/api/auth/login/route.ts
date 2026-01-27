import { NextRequest } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { generateTokenPair } from '@/lib/jwt'
import { cookies } from 'next/headers'

// Use Node.js runtime (required for jsonwebtoken)
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json()

    if (!email || !password) {
      return Response.json(
        errorResponse('Missing credentials', 'Email and password are required'),
        { status: 400 }
      )
    }

    const user = await authenticateUser(email, password)

    if (!user) {
      return Response.json(
        errorResponse('Invalid credentials', 'Email or password is incorrect'),
        { status: 401 }
      )
    }

    // Generate JWT tokens
    const tokenPair = generateTokenPair({
      userId: user.id,
      role: user.role,
      username: user.username,
    })

    // Set refresh token in httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days if remember me, else 7 days
      path: '/',
    })

    // authenticateUser already returns user without password field
    return Response.json(
      successResponse(
        {
          user: user,
          accessToken: tokenPair.accessToken,
        },
        'Login successful'
      )
    )
  } catch (error: any) {
    console.error('Login error:', error)
    
    // More detailed error messages for debugging
    const errorMessage = error?.message || 'An error occurred during login'
    
    // Check if it's a database connection error
    if (errorMessage.includes('connect') || errorMessage.includes('P1001') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
      return Response.json(
        errorResponse('Database error', 'Database connection failed. Please check your database configuration.'),
        { status: 500 }
      )
    }
    
    return Response.json(
      errorResponse('Server error', errorMessage),
      { status: 500 }
    )
  }
}
