import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'
import { createBookingSchema, validateBookingDates, checkDateConflicts, isRoomAvailable, calculateBookingPrice } from '@/lib/booking-validators'
import { BookingError, RoomUnavailableError, DateConflictError, InvalidDateError, ValidationError } from '@/lib/booking-errors'
import { logBookingChange } from '@/lib/booking-audit'
import { generateBookingId } from '@/lib/booking-id-generator'

// GET /api/bookings - List all bookings with pagination (Phase 2)
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

    const where: any = {}
    if (status) where.status = status
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.checkIn = { gte: startOfDay, lte: endOfDay }
    }
    
    // Search functionality
    if (search) {
      where.OR = [
        { bookingId: { contains: search, mode: 'insensitive' } },
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
          bill: true,
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
    console.error('Error fetching bookings:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch bookings'),
      { status: 500 }
    )
  }
}

// POST /api/bookings - Create new booking with all Phase 1-3 improvements
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const userId = (authResult as any).userId // Get user ID from auth

    const data = await request.json()

    // Phase 1: Input validation with Zod
    const validationResult = createBookingSchema.safeParse({
      ...data,
      totalAmount: parseFloat(data.totalAmount) || 0,
      discount: parseFloat(data.discount) || 0,
    })

    if (!validationResult.success) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', validationResult.error.errors[0]?.message || 'Invalid input'),
        { status: 400 }
      )
    }

    const validatedData = validationResult.data
    
    // Convert date strings to Date objects
    // Handle both date-only strings (YYYY-MM-DD) and ISO datetime strings
    let checkInDate = new Date(validatedData.checkIn)
    let checkOutDate = new Date(validatedData.checkOut)
    
    // If date-only string, set time to start/end of day
    if (validatedData.checkIn.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkInDate.setHours(0, 0, 0, 0)
    }
    if (validatedData.checkOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkOutDate.setHours(23, 59, 59, 999)
    }
    
    // Validate dates are valid
    if (isNaN(checkInDate.getTime())) {
      throw new InvalidDateError('Invalid check-in date format')
    }
    if (isNaN(checkOutDate.getTime())) {
      throw new InvalidDateError('Invalid check-out date format')
    }

    // Phase 1: Date validation
    const dateValidation = validateBookingDates(checkInDate, checkOutDate)
    if (!dateValidation.valid) {
      throw new InvalidDateError(dateValidation.error || 'Invalid dates')
    }

    // Phase 1: Transaction management - All operations in one transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Phase 1: Check room availability
      const room = await tx.room.findUnique({
        where: { id: validatedData.roomId },
      })

      if (!room) {
        throw new RoomUnavailableError(validatedData.roomId, 'Room not found')
      }

      if (room.status === 'MAINTENANCE') {
        throw new RoomUnavailableError(validatedData.roomId, 'Room is under maintenance')
      }

      // Phase 1: Check for date conflicts
      const conflictCheck = await checkDateConflicts(
        validatedData.roomId,
        checkInDate,
        checkOutDate
      )

      if (conflictCheck.hasConflict) {
        throw new DateConflictError(
          `Room is already booked from ${conflictCheck.conflictingBooking?.checkIn} to ${conflictCheck.conflictingBooking?.checkOut}`
        )
      }

      // Handle slot - create one if not provided
      let slot = null
      if (validatedData.slotId) {
        slot = await tx.roomSlot.findUnique({
          where: { id: validatedData.slotId },
        })

        if (!slot || !slot.isAvailable) {
          throw new RoomUnavailableError(validatedData.roomId, 'Selected slot is not available')
        }
      } else {
        // Create a default FULL_DAY slot if none provided
        const checkInDateOnly = new Date(checkInDate)
        checkInDateOnly.setHours(0, 0, 0, 0)

        slot = await tx.roomSlot.create({
          data: {
            roomId: validatedData.roomId,
            date: checkInDateOnly,
            slotType: 'FULL_DAY',
            price: room.basePrice,
            isAvailable: false,
          },
        })
      }

      // Create or find guest
      let guest = await tx.guest.findFirst({
        where: { phone: validatedData.guestPhone },
      })

      if (!guest) {
        guest = await tx.guest.create({
          data: {
            name: validatedData.guestName,
            phone: validatedData.guestPhone,
            idProof: validatedData.guestIdProof,
            address: validatedData.guestAddress,
          },
        })
      } else {
        // Update guest info if provided
        guest = await tx.guest.update({
          where: { id: guest.id },
          data: {
            name: validatedData.guestName,
            idProof: validatedData.guestIdProof || guest.idProof,
            address: validatedData.guestAddress || guest.address,
          },
        })
      }

      // Phase 1: Calculate price using centralized function
      const priceCalculation = calculateBookingPrice(
        room.basePrice,
        checkInDate,
        checkOutDate,
        validatedData.discount
      )

      // Generate custom booking ID (RETINU0123 format) inside transaction
      const bookingId = await generateBookingId(tx)

      // Create booking with custom ID
      const booking = await tx.booking.create({
        data: {
          id: bookingId,
          roomId: validatedData.roomId,
          slotId: slot.id,
          guestId: guest.id,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalAmount: priceCalculation.totalAmount,
          status: 'CONFIRMED',
        },
        include: {
          room: true,
          slot: true,
          guest: true,
        },
      })

      // Mark slot as unavailable
      await tx.roomSlot.update({
        where: { id: slot.id },
        data: { isAvailable: false },
      })

      // Update room status
      await tx.room.update({
        where: { id: validatedData.roomId },
        data: { status: 'BOOKED' },
      })

      // Generate bill
      const billNumber = `BILL-${Date.now()}`

      const bill = await tx.bill.create({
        data: {
          bookingId: booking.id,
          billNumber,
          subtotal: priceCalculation.subtotal,
          tax: priceCalculation.tax,
          discount: priceCalculation.discountAmount,
          totalAmount: priceCalculation.totalAmount,
          balanceAmount: priceCalculation.totalAmount,
          paymentStatus: 'PENDING',
        },
      })

      // Phase 3: Log booking creation to audit trail
      await logBookingChange(
        booking.id,
        'CREATED',
        userId,
        [
          { field: 'status', oldValue: null, newValue: 'CONFIRMED' },
          { field: 'roomId', oldValue: null, newValue: validatedData.roomId },
          { field: 'checkIn', oldValue: null, newValue: checkInDate },
          { field: 'checkOut', oldValue: null, newValue: checkOutDate },
        ],
        'Booking created successfully'
      )

      return { booking, bill }
    })

    return Response.json(
      successResponse(
        { ...result.booking, bill: result.bill },
        'Booking created and bill generated successfully'
      )
    )
  } catch (error: any) {
    // Phase 2: Comprehensive error handling
    if (error instanceof BookingError) {
      return Response.json(
        errorResponse(error.code, error.message),
        { status: error.statusCode }
      )
    }

    console.error('Error creating booking:', error)
    return Response.json(
      errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    )
  }
}
