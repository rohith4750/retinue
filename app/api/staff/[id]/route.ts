import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/staff/[id] - Get single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const staff = await prisma.staff.findUnique({
      where: { id: params.id },
      include: {
        attendance: {
          take: 30,
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!staff) {
      return Response.json(
        errorResponse('Not found', 'Staff member not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(staff))
  } catch (error) {
    console.error('Error fetching staff:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch staff member'),
      { status: 500 }
    )
  }
}

// PUT /api/staff/[id] - Update staff member (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { name, role, phone, salary, status } = data

    const staff = await prisma.staff.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(phone && { phone }),
        ...(salary !== undefined && { salary: salary ? parseFloat(salary) : null }),
        ...(status && { status }),
      },
    })

    return Response.json(successResponse(staff, 'Staff member updated successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Staff member not found'),
        { status: 404 }
      )
    }
    console.error('Error updating staff:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to update staff member'),
      { status: 500 }
    )
  }
}

// DELETE /api/staff/[id] - Delete staff member (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    // Delete staff member (attendance records will cascade delete)
    await prisma.staff.delete({
      where: { id: params.id },
    })

    return Response.json(successResponse(null, 'Staff member deleted successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Staff member not found'),
        { status: 404 }
      )
    }
    console.error('Error deleting staff:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete staff member'),
      { status: 500 }
    )
  }
}
