import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/bookings/history - Get all booking history with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const action = searchParams.get('action')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}

    // Filter by booking ID
    if (bookingId) {
      where.bookingId = bookingId
    }

    // Filter by action type
    if (action) {
      where.action = action
    }

    // Filter by date range
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.timestamp.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.timestamp.lte = end
      }
    }

    const [history, total] = await Promise.all([
      prisma.bookingHistory.findMany({
        where,
        skip,
        take: limit,
        include: {
          booking: {
            include: {
              guest: true,
              room: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.bookingHistory.count({ where }),
    ])

    return Response.json(
      successResponse({
        data: history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    )
  } catch (error) {
    console.error('Error fetching booking history:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch booking history'),
      { status: 500 }
    )
  }
}
