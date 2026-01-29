import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

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
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { roomNumber, roomType, floor, basePrice, capacity, status, maintenanceReason } = data

    const room = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(roomNumber !== undefined && { roomNumber }),
        ...(roomType !== undefined && { roomType }),
        ...(floor !== undefined && { floor: parseInt(floor) }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(capacity !== undefined && { capacity: parseInt(capacity) }),
        ...(status !== undefined && { status }),
        // When status is MAINTENANCE, store reason; otherwise clear it
        ...(status !== undefined && {
          maintenanceReason: status === 'MAINTENANCE' ? (maintenanceReason ?? null) : null,
        }),
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
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    // Check if room has any active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        roomId: params.id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        },
      },
    })

    if (activeBookings > 0) {
      return Response.json(
        errorResponse(
          'ROOM_HAS_ACTIVE_BOOKINGS',
          `Cannot delete room with ${activeBookings} active booking(s). Cancel or check-out all bookings first.`
        ),
        { status: 400 }
      )
    }

    // Check if room has any historical bookings (completed/cancelled)
    const historicalBookings = await prisma.booking.count({
      where: {
        roomId: params.id,
        status: {
          in: ['CHECKED_OUT', 'CANCELLED'],
        },
      },
    })

    // Use transaction to handle deletion
    await prisma.$transaction(async (tx: any) => {
      // If there are historical bookings, delete them first (to maintain referential integrity)
      if (historicalBookings > 0) {
        // Delete booking history for these bookings
        const bookingIds = await tx.booking.findMany({
          where: { roomId: params.id },
          select: { id: true },
        })
        
        const ids = bookingIds.map((b: any) => b.id)
        
        // Delete booking history
        await tx.bookingHistory.deleteMany({
          where: { bookingId: { in: ids } },
        })
        
        // Delete bills
        await tx.bill.deleteMany({
          where: { bookingId: { in: ids } },
        })
        
        // Delete bookings
        await tx.booking.deleteMany({
          where: { roomId: params.id },
        })
      }

      // Delete room slots
      await tx.roomSlot.deleteMany({
        where: { roomId: params.id },
      })

      // Delete the room
      await tx.room.delete({
        where: { id: params.id },
      })
    })

    return Response.json(successResponse(null, 'Room deleted successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Room not found'),
        { status: 404 }
      )
    }
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return Response.json(
        errorResponse(
          'ROOM_HAS_DEPENDENCIES',
          'Cannot delete room. It has associated records. Contact administrator.'
        ),
        { status: 400 }
      )
    }
    
    console.error('Error deleting room:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete room'),
      { status: 500 }
    )
  }
}
