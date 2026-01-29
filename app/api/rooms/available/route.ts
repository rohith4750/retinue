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

    // Find bookings that overlap the requested dates.
    // Check-out day = available: occupancy is [checkIn, startOf(checkOut day)), so a room is free on its check-out date.
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
      select: { roomId: true, checkOut: true },
    })

    const checkInStart = new Date(checkInDate)
    checkInStart.setHours(0, 0, 0, 0)
    const blockingBookings = overlappingBookings.filter((b) => {
      const checkoutDayStart = new Date(b.checkOut)
      checkoutDayStart.setHours(0, 0, 0, 0)
      return checkoutDayStart > checkInStart
    })
    const bookedIdsSet = new Set(blockingBookings.map((b) => b.roomId))
    // For each booked room, store check-out time (latest if multiple overlapping)
    const checkOutByRoom = new Map<string, Date>()
    for (const b of blockingBookings) {
      const existing = checkOutByRoom.get(b.roomId)
      if (!existing || new Date(b.checkOut) > existing) {
        checkOutByRoom.set(b.roomId, new Date(b.checkOut))
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
        return {
          ...room,
          status: 'BOOKED' as const,
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
