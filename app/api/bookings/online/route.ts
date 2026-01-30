import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

/**
 * GET /api/bookings/online
 * List only online bookings (source = ONLINE from public site). Separate from staff bookings.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      source: 'ONLINE',
      status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
    }
    if (status) where.status = status
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.checkIn = { gte: startOfDay, lte: endOfDay }
    }
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { bookingReference: { contains: search, mode: 'insensitive' } },
        { billNumber: { contains: search, mode: 'insensitive' } },
        { guest: { name: { contains: search, mode: 'insensitive' } } },
        { guest: { phone: { contains: search, mode: 'insensitive' } } },
        { room: { roomNumber: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          room: true,
          slot: true,
          guest: true,
          history: { orderBy: { timestamp: 'asc' }, take: 20 },
        },
        orderBy: { bookingDate: 'desc' },
      }),
      prisma.booking.count({ where }),
    ])

    return Response.json(
      successResponse({
        data: bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    )
  } catch (error) {
    console.error('Error fetching online bookings:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch online bookings'),
      { status: 500 }
    )
  }
}
