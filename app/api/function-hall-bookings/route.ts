import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { logHallBookingChange } from '@/lib/hall-booking-audit'

// GET /api/function-hall-bookings - List all function hall bookings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const hallId = searchParams.get('hallId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    
    // Exclude cancelled by default
    if (status) {
      where.status = status
    } else {
      where.status = { notIn: ['CANCELLED'] }
    }
    
    if (hallId) where.hallId = hallId
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { eventType: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [bookings, total] = await Promise.all([
      (prisma as any).functionHallBooking.findMany({
        where,
        skip,
        take: limit,
        include: {
          hall: true
        },
        orderBy: { eventDate: 'desc' }
      }),
      (prisma as any).functionHallBooking.count({ where })
    ])

    return Response.json(
      successResponse({
        data: bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    )
  } catch (error) {
    console.error('Error fetching function hall bookings:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch function hall bookings'),
      { status: 500 }
    )
  }
}

// POST /api/function-hall-bookings - Create new function hall booking
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const {
      hallId,
      customerName,
      customerPhone,
      customerEmail,
      eventType,
      eventDate,
      startTime,
      endTime,
      expectedGuests,
      totalAmount,
      advanceAmount,
      specialRequests,
    } = data

    // Validation
    if (!hallId || !customerName || !customerPhone || !eventType || !eventDate || !startTime || !endTime || !expectedGuests || !totalAmount) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'All required fields must be provided'),
        { status: 400 }
      )
    }

    // Check if hall exists
    const hall = await (prisma as any).functionHall.findUnique({
      where: { id: hallId }
    })

    if (!hall) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Function hall not found'),
        { status: 404 }
      )
    }

    // Check capacity
    if (parseInt(expectedGuests) > hall.capacity) {
      return Response.json(
        errorResponse('CAPACITY_EXCEEDED', `Hall capacity is ${hall.capacity} guests`),
        { status: 400 }
      )
    }

    // Check for conflicting bookings on the same date
    const eventDateObj = new Date(eventDate)
    const startOfDay = new Date(eventDateObj)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(eventDateObj)
    endOfDay.setHours(23, 59, 59, 999)

    const conflictingBooking = await (prisma as any).functionHallBooking.findFirst({
      where: {
        hallId,
        eventDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    })

    if (conflictingBooking) {
      return Response.json(
        errorResponse('DATE_CONFLICT', 'Hall is already booked for this date'),
        { status: 400 }
      )
    }

    const advance = parseFloat(advanceAmount) || 0
    const total = parseFloat(totalAmount)
    
    // Grand total at creation = hall amount (electricity and other charges added from bookings list later)
    const grandTotal = total

    const booking = await (prisma as any).functionHallBooking.create({
      data: {
        hallId,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        eventType,
        eventDate: eventDateObj,
        startTime,
        endTime,
        expectedGuests: parseInt(expectedGuests),
        totalAmount: total,
        advanceAmount: advance,
        balanceAmount: grandTotal - advance,
        specialRequests: specialRequests || null,
        status: 'CONFIRMED',
        grandTotal,
      },
      include: {
        hall: true
      }
    })

    const userId = (authResult as any).userId
    await logHallBookingChange(
      booking.id,
      'CREATED',
      userId,
      [
        { field: 'status', oldValue: null, newValue: 'CONFIRMED' },
        { field: 'hallId', oldValue: null, newValue: hallId },
        { field: 'eventType', oldValue: null, newValue: eventType },
        { field: 'eventDate', oldValue: null, newValue: eventDateObj },
        { field: 'totalAmount', oldValue: null, newValue: total },
        { field: 'advanceAmount', oldValue: null, newValue: advance },
        { field: 'balanceAmount', oldValue: null, newValue: grandTotal - advance },
        { field: 'customerName', oldValue: null, newValue: customerName },
      ],
      `Hall booking created for ${hall.name}. Total ₹${total.toLocaleString()}, advance ₹${advance.toLocaleString()}.`,
    )

    return Response.json(successResponse(booking, 'Function hall booking created successfully'))
  } catch (error: any) {
    console.error('Error creating function hall booking:', error)
    return Response.json(
      errorResponse('Server error', error.message || 'Failed to create booking'),
      { status: 500 }
    )
  }
}
