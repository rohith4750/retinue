import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { UserRole } from '@prisma/client'

// GET /api/rooms/[id] - Get single room
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        slots: {
          where: {
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
        },
      },
    })

    if (!room) {
      return Response.json(
        errorResponse('Not found', 'Room not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(room))
  } catch (error) {
    console.error('Error fetching room:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch room'),
      { status: 500 }
    )
  }
}

// PUT /api/rooms/[id] - Update room (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(UserRole.ADMIN)(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { roomNumber, roomType, floor, basePrice, capacity, status } = data

    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(roomNumber && { roomNumber }),
        ...(roomType && { roomType }),
        ...(floor && { floor: parseInt(floor) }),
        ...(basePrice && { basePrice: parseFloat(basePrice) }),
        ...(capacity && { capacity: parseInt(capacity) }),
        ...(status && { status }),
      },
    })

    return Response.json(successResponse(room, 'Room updated successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Room not found'),
        { status: 404 }
      )
    }
    console.error('Error updating room:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to update room'),
      { status: 500 }
    )
  }
}

// DELETE /api/rooms/[id] - Delete room (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(UserRole.ADMIN)(request)
    if (authResult instanceof Response) return authResult

    await prisma.room.delete({
      where: { id: params.id },
    })

    return Response.json(successResponse(null, 'Room deleted successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Room not found'),
        { status: 404 }
      )
    }
    console.error('Error deleting room:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete room'),
      { status: 500 }
    )
  }
}
