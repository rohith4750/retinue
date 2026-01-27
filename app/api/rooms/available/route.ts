import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/rooms/available - Get rooms available for specific dates
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const checkIn = searchParams.get('checkIn')
    const checkOut = searchParams.get('checkOut')
    const roomType = searchParams.get('roomType')

    // If no dates provided, return all available rooms (not in MAINTENANCE)
    if (!checkIn || !checkOut) {
      const rooms = await prisma.room.findMany({
        where: {
          status: { not: 'MAINTENANCE' },
        },
        orderBy: { roomNumber: 'asc' },
      })
      return Response.json(
        successResponse({
          rooms: rooms,
          dateRange: null,
          bookedRoomCount: 0,
          availableRoomCount: rooms.length,
        })
      )
    }

    // Parse dates
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // Validate dates
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return Response.json(
        errorResponse('INVALID_DATE', 'Invalid date format'),
        { status: 400 }
      )
    }

    if (checkOutDate <= checkInDate) {
      return Response.json(
        errorResponse('INVALID_DATE', 'Check-out must be after check-in'),
        { status: 400 }
      )
    }

    // Find rooms that have overlapping bookings for the selected dates
    // Two date ranges overlap if: startA < endB AND startB < endA
    const bookedRoomIds = await prisma.booking.findMany({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        },
        // Date overlap: existing.checkIn < newCheckOut AND newCheckIn < existing.checkOut
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
      select: {
        roomId: true,
      },
      distinct: ['roomId'], // Ensure unique room IDs
    })

    const bookedIds = bookedRoomIds.map((b) => b.roomId)

    // Build query for available rooms
    const where: any = {
      status: { not: 'MAINTENANCE' },
    }

    // Exclude booked rooms
    if (bookedIds.length > 0) {
      where.id = { notIn: bookedIds }
    }

    // Filter by room type if provided
    if (roomType) {
      where.roomType = roomType
    }

    // Get available rooms
    const availableRooms = await prisma.room.findMany({
      where,
      orderBy: { roomNumber: 'asc' },
    })

    return Response.json(
      successResponse({
        rooms: availableRooms,
        dateRange: {
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
        },
        bookedRoomCount: bookedIds.length,
        availableRoomCount: availableRooms.length,
      })
    )
  } catch (error) {
    console.error('Error fetching available rooms:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch available rooms'),
      { status: 500 }
    )
  }
}
