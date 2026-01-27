import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/function-halls/[id] - Get single function hall
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const hall = await prisma.functionHall.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            eventDate: { gte: new Date() }
          },
          orderBy: { eventDate: 'asc' },
          take: 10
        }
      }
    })

    if (!hall) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Function hall not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(hall))
  } catch (error) {
    console.error('Error fetching function hall:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch function hall'),
      { status: 500 }
    )
  }
}

// PUT /api/function-halls/[id] - Update function hall
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { name, capacity, pricePerDay, pricePerHour, amenities, description, status } = data

    // Check if hall exists
    const existingHall = await prisma.functionHall.findUnique({
      where: { id: params.id }
    })

    if (!existingHall) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Function hall not found'),
        { status: 404 }
      )
    }

    // Check for duplicate name (if name is being changed)
    if (name && name !== existingHall.name) {
      const duplicateHall = await prisma.functionHall.findUnique({
        where: { name }
      })
      if (duplicateHall) {
        return Response.json(
          errorResponse('DUPLICATE_ERROR', 'A function hall with this name already exists'),
          { status: 400 }
        )
      }
    }

    const hall = await prisma.functionHall.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(pricePerDay && { pricePerDay: parseFloat(pricePerDay) }),
        ...(pricePerHour !== undefined && { pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null }),
        ...(amenities !== undefined && { amenities }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      }
    })

    return Response.json(successResponse(hall, 'Function hall updated successfully'))
  } catch (error: any) {
    console.error('Error updating function hall:', error)
    return Response.json(
      errorResponse('Server error', error.message || 'Failed to update function hall'),
      { status: 500 }
    )
  }
}

// DELETE /api/function-halls/[id] - Delete function hall
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    // Check if hall has active bookings
    const activeBookings = await prisma.functionHallBooking.count({
      where: {
        hallId: params.id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    })

    if (activeBookings > 0) {
      return Response.json(
        errorResponse('HAS_ACTIVE_BOOKINGS', 'Cannot delete hall with active bookings'),
        { status: 400 }
      )
    }

    await prisma.functionHall.delete({
      where: { id: params.id }
    })

    return Response.json(successResponse(null, 'Function hall deleted successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('NOT_FOUND', 'Function hall not found'),
        { status: 404 }
      )
    }
    console.error('Error deleting function hall:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete function hall'),
      { status: 500 }
    )
  }
}
