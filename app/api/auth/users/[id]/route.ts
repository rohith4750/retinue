import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST'

// Validation schema for updating a user
const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.union([z.string().email(), z.string().length(0), z.undefined()]).optional(),
  password: z.string().min(6).max(100).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST']).optional(),
})

// GET /api/auth/users/[id] - Get a specific user (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return Response.json(
        errorResponse('NOT_FOUND', 'User not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(user))
  } catch (error) {
    console.error('Error fetching user:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch user'),
      { status: 500 }
    )
  }
}

// PUT /api/auth/users/[id] - Update a user (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body) as {
      username?: string
      email?: string
      password?: string
      role?: UserRole
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return Response.json(
        errorResponse('NOT_FOUND', 'User not found'),
        { status: 404 }
      )
    }

    // Check if username already exists (if being updated)
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: validatedData.username },
      })

      if (usernameExists) {
        return Response.json(
          errorResponse('VALIDATION_ERROR', 'Username already exists'),
          { status: 400 }
        )
      }
    }

    // Check if email already exists (if being updated)
    const emailValue = validatedData.email && typeof validatedData.email === 'string' && validatedData.email.trim() !== ''
      ? validatedData.email.trim()
      : undefined

    if (emailValue && emailValue !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: emailValue },
      })

      if (emailExists) {
        return Response.json(
          errorResponse('VALIDATION_ERROR', 'Email already exists'),
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (validatedData.username) updateData.username = validatedData.username
    if (emailValue !== undefined) updateData.email = emailValue || null
    if (validatedData.password) updateData.password = await hashPassword(validatedData.password)
    if (validatedData.role) updateData.role = validatedData.role

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return Response.json(
      successResponse(updatedUser, 'User updated successfully')
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return Response.json(
        errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid input'),
        { status: 400 }
      )
    }
    console.error('Error updating user:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to update user'),
      { status: 500 }
    )
  }
}

// DELETE /api/auth/users/[id] - Delete a user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return Response.json(
        errorResponse('NOT_FOUND', 'User not found'),
        { status: 404 }
      )
    }

    // Prevent deleting yourself
    const currentUserId = (authResult as any).id
    if (params.id === currentUserId) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Cannot delete your own account'),
        { status: 400 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    })

    return Response.json(
      successResponse(null, 'User deleted successfully')
    )
  } catch (error) {
    console.error('Error deleting user:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete user'),
      { status: 500 }
    )
  }
}
