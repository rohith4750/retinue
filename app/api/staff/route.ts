import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

// GET /api/staff - List all staff
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const staff = await prisma.staff.findMany({
      include: {
        attendance: {
          take: 30,
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return Response.json(successResponse(staff))
  } catch (error) {
    console.error('Error fetching staff:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch staff'),
      { status: 500 }
    )
  }
}

// POST /api/staff - Create staff member (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { name, role, phone, salary, status } = data

    if (!name || !role || !phone) {
      return Response.json(
        errorResponse('Validation error', 'Missing required fields'),
        { status: 400 }
      )
    }

    const staff = await prisma.staff.create({
      data: {
        name,
        role,
        phone,
        salary: salary ? parseFloat(salary) : null,
        status: status || 'ACTIVE',
      },
    })

    return Response.json(successResponse(staff, 'Staff member created successfully'))
  } catch (error) {
    console.error('Error creating staff:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to create staff member'),
      { status: 500 }
    )
  }
}
