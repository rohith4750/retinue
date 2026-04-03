import { NextRequest } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { generateTokenPair } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION } from '@/lib/constants'
import { getRateLimitState, incrementRateLimit, clearRateLimit } from '@/lib/rate-limit'
import { recordSecurityEvent } from '@/lib/security-audit'

// Use Node.js runtime (required for jsonwebtoken)
export const runtime = 'nodejs'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { email, password, rememberMe } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const identityKey = `login:identity:${normalizedEmail || 'unknown'}`
    const ipKey = `login:ip:${ip}`

    const identityLimit = getRateLimitState(identityKey, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION)
    const ipLimit = getRateLimitState(ipKey, MAX_LOGIN_ATTEMPTS * 5, LOCKOUT_DURATION)

    if (identityLimit.limited || ipLimit.limited) {
      const retryAfterMs = Math.max(identityLimit.retryAfterMs, ipLimit.retryAfterMs)
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
      await recordSecurityEvent({
        event: 'login_rate_limited',
        severity: 'warn',
        ip,
        identity: normalizedEmail || undefined,
        details: { retryAfterSeconds },
      })
      return Response.json(
        errorResponse('Too many attempts', `Too many login attempts. Try again in ${retryAfterSeconds} seconds.`),
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      )
    }

    if (!email || !password) {
      incrementRateLimit(identityKey, LOCKOUT_DURATION)
      incrementRateLimit(ipKey, LOCKOUT_DURATION)
      await recordSecurityEvent({
        event: 'login_missing_credentials',
        severity: 'warn',
        ip,
        identity: normalizedEmail || undefined,
      })
      return Response.json(
        errorResponse('Missing credentials', 'Email and password are required'),
        { status: 400 }
      )
    }

    const user = await authenticateUser(email, password)

    if (!user) {
      const identityState = incrementRateLimit(identityKey, LOCKOUT_DURATION)
      const ipState = incrementRateLimit(ipKey, LOCKOUT_DURATION)
      const suspicious = ipState.count >= MAX_LOGIN_ATTEMPTS * 3
      await recordSecurityEvent({
        event: suspicious ? 'suspicious_login_activity' : 'login_failed',
        severity: suspicious ? 'critical' : 'warn',
        ip,
        identity: normalizedEmail || undefined,
        details: { identityFailures: identityState.count, ipFailures: ipState.count },
      })
      return Response.json(
        errorResponse('Invalid credentials', 'Email or password is incorrect'),
        { status: 401 }
      )
    }

    clearRateLimit(identityKey)
    clearRateLimit(ipKey)

    // Generate JWT tokens
    const tokenPair = generateTokenPair({
      userId: user.id,
      role: user.role,
      username: user.username,
      rememberMe: !!rememberMe,
    })

    // Set refresh token in httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('accessToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })
    cookieStore.set('refreshToken', tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days if remember me, else 7 days
      path: '/',
    })

    await recordSecurityEvent({
      event: 'login_success',
      severity: 'info',
      ip,
      identity: normalizedEmail || undefined,
      details: { userId: user.id, role: user.role },
    })

    // authenticateUser already returns user without password field
    return Response.json(
      successResponse(
        {
          user: user,
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
