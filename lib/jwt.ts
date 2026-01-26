// Conditional import for jsonwebtoken (install with: npm install jsonwebtoken @types/jsonwebtoken)
let jwt: any
try {
  jwt = require('jsonwebtoken')
} catch {
  // Fallback if jsonwebtoken is not installed
  console.warn('jsonwebtoken not installed. Please run: npm install jsonwebtoken @types/jsonwebtoken')
}

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'
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
  if (!jwt) {
    throw new Error('jsonwebtoken is not installed. Please run: npm install jsonwebtoken @types/jsonwebtoken')
  }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'hotel-management-system',
  })
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload: TokenPayload): string {
  if (!jwt) {
    throw new Error('jsonwebtoken is not installed. Please run: npm install jsonwebtoken @types/jsonwebtoken')
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'hotel-management-system',
  })
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
  if (!jwt) {
    return null
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  if (!jwt) {
    return null
  }
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload
    return decoded
  } catch (error) {
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
