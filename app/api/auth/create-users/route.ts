import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { createUser } from '@/lib/auth'
// @ts-expect-error - UserRole is available at runtime from Prisma client
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// POST /api/auth/create-users - Create default users for all roles
export async function POST(request: NextRequest) {
  try {
    // Default credentials for each role
    const defaultUsers = [
      {
        username: 'superadmin',
        password: 'superadmin123',
        role: UserRole.SUPER_ADMIN,
      },
      {
        username: 'admin',
        password: 'admin123',
        role: UserRole.ADMIN,
      },
      {
        username: 'receptionist',
        password: 'receptionist123',
        role: UserRole.RECEPTIONIST,
      },
      {
        username: 'staff',
        password: 'staff123',
        role: UserRole.STAFF,
      },
    ]

    const createdUsers = []
    const skippedUsers = []

    for (const userData of defaultUsers) {
      try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { username: userData.username },
        })

        if (existing) {
          skippedUsers.push({
            username: userData.username,
            role: userData.role,
            reason: 'User already exists',
          })
          continue
        }

        // Create user (default users don't have email)
        const user = await createUser(userData.username, userData.password, userData.role)
        createdUsers.push({
          id: user.id,
          username: user.username,
          role: user.role,
        })
      } catch (error: any) {
        skippedUsers.push({
          username: userData.username,
          role: userData.role,
          reason: error.message || 'Failed to create user',
        })
      }
    }

    return Response.json(
      successResponse(
        {
          created: createdUsers,
          skipped: skippedUsers,
          total: defaultUsers.length,
          createdCount: createdUsers.length,
          skippedCount: skippedUsers.length,
        },
        `Created ${createdUsers.length} user(s), ${skippedUsers.length} skipped`
      )
    )
  } catch (error) {
    console.error('Error creating users:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to create users'),
      { status: 500 }
    )
  }
}

// GET /api/auth/create-users - List all users (for verification)
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
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
