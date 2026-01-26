import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/rooms/slots - Get available slots for a date
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const roomId = searchParams.get('roomId')

    if (!date) {
      return Response.json(
        errorResponse('Validation error', 'Date parameter is required'),
        { status: 400 }
      )
    }

    const where: any = {
      date: new Date(date),
      isAvailable: true,
    }

    if (roomId) {
      where.roomId = roomId
    }

    const slots = await prisma.roomSlot.findMany({
      where,
      include: {
        room: true,
      },
      orderBy: [
        { room: { roomNumber: 'asc' } },
        { slotType: 'asc' },
      ],
    })

    return Response.json(successResponse(slots))
  } catch (error) {
    console.error('Error fetching slots:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch slots'),
      { status: 500 }
    )
  }
}

// POST /api/rooms/slots - Create slots for rooms
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { roomId, date, slotType, price } = data

    if (!roomId || !date || !slotType || price === undefined) {
      return Response.json(
        errorResponse('Validation error', 'Missing required fields'),
        { status: 400 }
      )
    }

    // Check if slot already exists
    const existing = await prisma.roomSlot.findFirst({
      where: {
        roomId,
        date: new Date(date),
        slotType,
      },
    })

    if (existing) {
      return Response.json(
        errorResponse('Duplicate slot', 'Slot already exists for this room and date'),
        { status: 400 }
      )
    }

    const slot = await prisma.roomSlot.create({
      data: {
        roomId,
        date: new Date(date),
        slotType,
        price: parseFloat(price),
        isAvailable: true,
      },
      include: {
        room: true,
      },
    })

    return Response.json(successResponse(slot, 'Slot created successfully'))
  } catch (error) {
    console.error('Error creating slot:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to create slot'),
      { status: 500 }
    )
  }
}
