import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { verifyAccessToken, extractTokenFromHeader } from './jwt'
import { ERROR_CODES } from './constants'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  }
}

export function errorResponse(error: string, message?: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    code: code || ERROR_CODES.SERVER_ERROR,
  }
}

// JWT-based session management
export async function getSessionUser(request: NextRequest): Promise<{ id: string; role: UserRole; username: string } | null> {
  const authHeader = request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)
  
  if (!token) return null

  try {
    // Verify JWT token
    const payload = verifyAccessToken(token)
    if (!payload) return null

    // Optionally verify user still exists (can be cached for performance)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, username: true },
    })

    if (!user || user.role !== payload.role) {
      return null
    }

    return {
      id: user.id,
      role: user.role,
      username: user.username,
    }
  } catch {
    return null
  }
}

export function requireAuth(requiredRole?: UserRole) {
  return async (request: NextRequest) => {
    const user = await getSessionUser(request)
    if (!user) {
      return Response.json(errorResponse('Unauthorized', 'Authentication required'), { status: 401 })
    }

    if (requiredRole) {
      const roleHierarchy: Record<UserRole, number> = {
        RECEPTIONIST: 1,
        ADMIN: 2,
        SUPER_ADMIN: 3,
      }

      if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
        return Response.json(
          errorResponse('Forbidden', 'Insufficient permissions'),
          { status: 403 }
        )
      }
    }

    return user
  }
}
