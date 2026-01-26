import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import type { UserRole } from '@prisma/client'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  }
}

export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
  }
}

// Simple session management (in production, use NextAuth or similar)
export async function getSessionUser(request: NextRequest): Promise<{ id: string; role: UserRole } | null> {
  // This is a placeholder - in production, use proper session management
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  try {
    // In production, verify JWT token here
    // For now, this is a simplified version
    const userId = authHeader.replace('Bearer ', '')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })
    return user
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
        STAFF: 1,
        RECEPTIONIST: 2,
        ADMIN: 3,
        SUPER_ADMIN: 4,
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
