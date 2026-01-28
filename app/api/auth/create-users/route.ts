import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { createUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST'

// POST /api/auth/create-users - Create default users for all roles
export async function POST(request: NextRequest) {
  try {
    // Default credentials for each role (now with email for login)
    const defaultUsers = [
      {
        username: 'superadmin',
        email: 'superadmin@theretinue.com',
        password: 'superadmin123',
        role: 'SUPER_ADMIN' as UserRole,
      },
      {
        username: 'admin',
        email: 'admin@theretinue.com',
        password: 'admin123',
        role: 'ADMIN' as UserRole,
      },
      {
        username: 'receptionist',
        email: 'receptionist@theretinue.com',
        password: 'receptionist123',
        role: 'RECEPTIONIST' as UserRole,
      },
      {
        username: 'staff',
        email: 'staff@theretinue.com',
        password: 'staff123',
        role: 'RECEPTIONIST' as UserRole,
      },
    ]

    const createdUsers = []
    const skippedUsers = []

    for (const userData of defaultUsers) {
      try {
        // Check if user already exists by email or username
        const existingByEmail = await prisma.user.findUnique({
          where: { email: userData.email },
        })
        const existingByUsername = await prisma.user.findUnique({
          where: { username: userData.username },
        })

        if (existingByEmail || existingByUsername) {
          skippedUsers.push({
            username: userData.username,
            email: userData.email,
            role: userData.role,
            reason: 'User already exists',
          })
          continue
        }

        // Create user with email
        const user = await createUser(userData.username, userData.password, userData.role, userData.email)
        createdUsers.push({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        })
      } catch (error: any) {
        skippedUsers.push({
          username: userData.username,
          email: userData.email,
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
