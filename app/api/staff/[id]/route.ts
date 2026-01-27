import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET /api/staff/[id] - Get single staff member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    const staff = await prisma.staff.findUnique({
      where: { id }
    })

    if (!staff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: staff })
  } catch (error) {
    console.error('Error fetching staff member:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff member' },
      { status: 500 }
    )
  }
}

// PUT /api/staff/[id] - Update staff member (SUPER_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params
    const body = await request.json()
    const { name, role, phone, salary, businessUnit, status } = body

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id }
    })

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (role) updateData.role = role
    if (phone) updateData.phone = phone
    if (salary !== undefined && salary !== '') updateData.salary = parseFloat(salary)
    if (businessUnit) updateData.businessUnit = businessUnit
    if (status) updateData.status = status

    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, data: updatedStaff })
  } catch (error) {
    console.error('Error updating staff member:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update staff member' },
      { status: 500 }
    )
  }
}

// DELETE /api/staff/[id] - Delete staff member (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id }
    })

    if (!existingStaff) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Delete associated salary payments first (cascade delete)
    // Using raw query to avoid TypeScript issues with generated types
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "SalaryPayment" WHERE "staffId" = $1`,
        id
      )
    } catch (e) {
      // Ignore if no salary payments exist
    }

    await prisma.staff.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' })
  } catch (error) {
    console.error('Error deleting staff member:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete staff member' },
      { status: 500 }
    )
  }
}
