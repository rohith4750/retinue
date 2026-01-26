import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { UserRole } from '@prisma/client'

// GET /api/rooms - List all rooms
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const roomType = searchParams.get('roomType')

    const where: any = {}
    if (status) where.status = status
    if (roomType) where.roomType = roomType

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { roomNumber: 'asc' },
    })

    return Response.json(successResponse(rooms))
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
    const authResult = await requireAuth(UserRole.ADMIN)(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { roomNumber, roomType, floor, basePrice, capacity, status } = data

    if (!roomNumber || !roomType || !floor || !basePrice || !capacity) {
      return Response.json(
        errorResponse('Validation error', 'Missing required fields'),
        { status: 400 }
      )
    }

    const room = await prisma.room.create({
      data: {
        roomNumber,
        roomType,
        floor: parseInt(floor),
        basePrice: parseFloat(basePrice),
        capacity: parseInt(capacity),
        status: status || 'AVAILABLE',
      },
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
