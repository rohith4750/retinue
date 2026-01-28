import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { createUser } from '@/lib/auth'
import { requireAuth } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST'

// Validation schema for creating a user (email is required for login)
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6).max(100),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST']),
})

// POST /api/auth/users - Create a new user (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body) as {
      username: string
      email: string
      password: string
      role: UserRole
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    })

    if (existingUsername) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Username already exists'),
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Email already exists'),
        { status: 400 }
      )
    }

    // Create user with required email
    const user = await createUser(
      validatedData.username,
      validatedData.password,
      validatedData.role,
      validatedData.email
    )

    return Response.json(
      successResponse(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        'User created successfully'
      )
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return Response.json(
        errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid input'),
        { status: 400 }
      )
    }
    console.error('Error creating user:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to create user'),
      { status: 500 }
    )
  }
}

// GET /api/auth/users - List all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json(successResponse(users))
  } catch (error) {
    console.error('Error fetching users:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch users'),
      { status: 500 }
    )
  }
}
