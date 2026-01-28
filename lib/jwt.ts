// Import jsonwebtoken (must be installed: npm install jsonwebtoken @types/jsonwebtoken)
import jwt, { type SignOptions } from 'jsonwebtoken'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
// Session timeout: 1 hour for access token
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1h'
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'

export interface TokenPayload {
  userId: string
  role: UserRole
  username: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: TokenPayload): string {
  if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET environment variable is not set. Please set it in Vercel environment variables.')
  }
  // Type assertion needed due to strict jsonwebtoken types - string values work fine at runtime
  return jwt.sign(
    payload as object,
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'hotel-management-system',
    } as SignOptions
  )
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set. Please set it in Vercel environment variables.')
  }
  // Type assertion needed due to strict jsonwebtoken types - string values work fine at runtime
  return jwt.sign(
    payload as object,
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'hotel-management-system',
    } as SignOptions
  )
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
    console.error('JWT_SECRET is not set. Token verification will fail.')
    return null
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error: any) {
    // Log error for debugging (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
      console.error('Token verification failed:', error.message)
    }
    return null
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
    console.error('JWT_REFRESH_SECRET is not set. Token verification will fail.')
    return null
  }
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
    return decoded
  } catch (error: any) {
    // Log error for debugging (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
      console.error('Refresh token verification failed:', error.message)
    }
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.replace('Bearer ', '')
}
