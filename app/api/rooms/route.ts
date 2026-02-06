import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

// GET /api/rooms - List all rooms (status derived from actual bookings so early checkout = available)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const roomType = searchParams.get('roomType')
    const search = searchParams.get('search')

    const where: any = {}
    if (roomType) where.roomType = roomType
    if (search) {
      where.OR = [
        { roomNumber: { contains: search, mode: 'insensitive' } },
        { roomType: { contains: search, mode: 'insensitive' } },
      ]
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { roomNumber: 'asc' },
    })

    // Derive effective status from actual bookings: only PENDING/CONFIRMED/CHECKED_IN block a room.
    // If booking was CHECKED_OUT (early or on time), room is AVAILABLE regardless of Room.status.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const overlapping = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkIn: { lt: tomorrow } },
          { checkOut: { gt: today } },
        ],
      },
      select: { roomId: true, checkOut: true },
    })
    const blocking = overlapping.filter((b) => {
      const checkoutDayStart = new Date(b.checkOut)
      checkoutDayStart.setHours(0, 0, 0, 0)
      return checkoutDayStart > today
    })
    const bookedRoomIds = new Set(blocking.map((b) => b.roomId))

    const roomsWithEffectiveStatus = rooms.map((room) => {
      if (room.status === 'MAINTENANCE') return { ...room, status: 'MAINTENANCE' as const }
      const effectiveStatus = bookedRoomIds.has(room.id) ? 'BOOKED' : 'AVAILABLE'
      return { ...room, status: effectiveStatus }
    })

    // Optional filter by status (applied after deriving effective status)
    const filtered =
      !status
        ? roomsWithEffectiveStatus
        : roomsWithEffectiveStatus.filter((r) => r.status === status)

    return Response.json(successResponse(filtered))
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch rooms'),
      { status: 500 }
    )
  }
}

// POST /api/rooms - Create new room (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { roomNumber, roomType, floor, basePrice, capacity, status, maintenanceReason } = data

    if (!roomNumber || !roomType || !floor || !basePrice || !capacity) {
      return Response.json(
        errorResponse('Validation error', 'Missing required fields'),
        { status: 400 }
      )
    }

    const createData: Record<string, unknown> = {
      roomNumber,
      roomType,
      floor: parseInt(floor),
      basePrice: parseFloat(basePrice),
      capacity: parseInt(capacity),
      status: status || 'AVAILABLE',
    }
    if (status === 'MAINTENANCE') {
      createData.maintenanceReason = maintenanceReason || null
    }
    const room = await prisma.room.create({
      data: createData as Parameters<typeof prisma.room.create>[0]['data'],
    })

    return Response.json(successResponse(room, 'Room created successfully'))
  } catch (error: any) {
    if (error.code === 'P2002') {
      return Response.json(
        errorResponse('Duplicate room', 'Room number already exists'),
        { status: 400 }
      )
    }
    console.error('Error creating room:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to create room'),
      { status: 500 }
    )
  }
}
