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

    // Time-based overlap: room is BOOKED if any active booking's [checkIn, checkOut] overlaps [filterCheckIn, filterCheckOut].
    // Overlap (strict): booking.checkIn < filterCheckOut AND booking.checkOut > filterCheckIn.
    // All comparisons use full datetime (no date-only logic) so "today" filter respects actual times.
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
      select: { roomId: true, checkIn: true, checkOut: true },
    })

    const bookedIdsSet = new Set(overlappingBookings.map((b) => b.roomId))
    // For each booked room, store check-in and check-out (from same booking; latest check-out wins)
    const checkOutByRoom = new Map<string, Date>()
    const checkInByRoom = new Map<string, Date>()
    for (const b of overlappingBookings) {
      const existingOut = checkOutByRoom.get(b.roomId)
      if (!existingOut || new Date(b.checkOut) > existingOut) {
        checkOutByRoom.set(b.roomId, new Date(b.checkOut))
        checkInByRoom.set(b.roomId, new Date(b.checkIn))
      }
    }

    const where: any = {}
    if (roomType) {
      where.roomType = roomType
    }

    const allRooms = await prisma.room.findMany({
      where,
      orderBy: { roomNumber: 'asc' },
    })

    const roomsWithStatus = allRooms.map((room) => {
      if (room.status === 'MAINTENANCE') {
        return { ...room, status: 'MAINTENANCE' as const }
      }
      if (bookedIdsSet.has(room.id)) {
        const checkOutAt = checkOutByRoom.get(room.id)
        const checkInAt = checkInByRoom.get(room.id)
        return {
          ...room,
          status: 'BOOKED' as const,
          checkInAt: checkInAt ? checkInAt.toISOString() : undefined,
          checkOutAt: checkOutAt ? checkOutAt.toISOString() : undefined,
        }
      }
      return { ...room, status: 'AVAILABLE' as const }
    })

    const availableCount = roomsWithStatus.filter((r) => r.status === 'AVAILABLE').length
    const bookedCount = roomsWithStatus.filter((r) => r.status === 'BOOKED').length

    return Response.json(
      successResponse({
        rooms: roomsWithStatus,
        dateRange: {
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
        },
        bookedRoomCount: bookedCount,
        availableRoomCount: availableCount,
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
