import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/function-halls/available - Get available halls for a specific date
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    // If no date provided, return all halls with their status
    if (!date) {
      const halls = await prisma.functionHall.findMany({
        where: {
          status: { not: 'MAINTENANCE' }
        },
        orderBy: { name: 'asc' }
      })
      return Response.json(
        successResponse({
          halls,
          date: null,
          bookedCount: 0,
          availableCount: halls.length
        })
      )
    }

    // Parse date
    const eventDate = new Date(date)
    if (isNaN(eventDate.getTime())) {
      return Response.json(
        errorResponse('INVALID_DATE', 'Invalid date format'),
        { status: 400 }
      )
    }

    // Get start and end of the day
    const startOfDay = new Date(eventDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(eventDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Find halls that are booked on this date
    const bookedHallIds = await prisma.functionHallBooking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        eventDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        hallId: true
      },
      distinct: ['hallId']
    })

    const bookedIds = bookedHallIds.map(b => b.hallId)

    // Get available halls (not booked and not in maintenance)
    const availableHalls = await prisma.functionHall.findMany({
      where: {
        status: { not: 'MAINTENANCE' },
        ...(bookedIds.length > 0 && { id: { notIn: bookedIds } })
      },
      orderBy: { name: 'asc' }
    })

    // Add availability status to each hall
    const hallsWithStatus = availableHalls.map(hall => ({
      ...hall,
      status: 'AVAILABLE' as const
    }))

    return Response.json(
      successResponse({
        halls: hallsWithStatus,
        date: eventDate.toISOString(),
        bookedCount: bookedIds.length,
        availableCount: availableHalls.length
      })
    )
  } catch (error) {
    console.error('Error fetching available function halls:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch available halls'),
      { status: 500 }
    )
  }
}
