import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'
import { createBookingSchema, validateBookingDates, checkDateConflicts, isRoomAvailable, calculateBookingPrice } from '@/lib/booking-validators'
import { BookingError, RoomUnavailableError, DateConflictError, InvalidDateError, ValidationError } from '@/lib/booking-errors'
import { logBookingChange } from '@/lib/booking-audit'
import { generateBookingId, generateBookingReference } from '@/lib/booking-id-generator'

// GET /api/bookings - List all bookings with pagination (Phase 2)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    const search = searchParams.get('search')
    const source = searchParams.get('source') // 'online' = from public site (hoteltheretinueonline.in)
    const forCalendar = searchParams.get('forCalendar') === '1' || searchParams.get('includeOnline') === '1' // rooms calendar: include all sources
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      // By default, show only active bookings (exclude CANCELLED and CHECKED_OUT)
      status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
      // Staff bookings page: exclude online (online has dedicated GET /api/bookings/online). For calendar view, include all.
      ...(forCalendar ? {} : { source: { not: 'ONLINE' } }),
    }
    if (status) where.status = status
    if (source === 'online' && !forCalendar) {
      where.source = 'ONLINE'
    }
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      where.checkIn = { gte: startOfDay, lte: endOfDay }
    }
    
    // Search functionality (id = booking ID e.g. RETINU0123)
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
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
          history: {
            orderBy: { timestamp: 'asc' },
            take: 20,
          },
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
// Supports both single room (roomId) and multiple rooms (roomIds)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const userId = (authResult as any).userId // Get user ID from auth

    const data = await request.json()

    // Single booking = one room. Support roomId (single) or roomIds (multi-room).
    // Deduplicate so we never create two bookings for the same room in one request.
    const rawRoomIds: string[] = data.roomIds || (data.roomId ? [data.roomId] : [])
    const roomIds = Array.from(new Set(rawRoomIds))

    if (roomIds.length === 0) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'At least one room must be selected'),
        { status: 400 }
      )
    }

    // Phase 1: Input validation with Zod (use first roomId for schema validation)
    const validationResult = createBookingSchema.safeParse({
      ...data,
      roomId: roomIds[0], // For schema validation
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
    // Each booking gets its own guest record (snapshot). We do NOT find by phone and update,
    // so creating a new booking never overwrites an existing guest's name on other bookings.
    const result = await prisma.$transaction(async (tx: any) => {
      const guest = await tx.guest.create({
        data: {
          name: validatedData.guestName,
          phone: validatedData.guestPhone,
          idProof: validatedData.guestIdProof,
          idProofType: data.guestIdProofType || 'AADHAR',
          guestType: data.guestType || 'WALK_IN',
          address: validatedData.guestAddress,
        },
      })

      const bookings: any[] = []

      // One booking per distinct room (roomIds already deduplicated above)
      const discountPerRoom = (parseFloat(String(validatedData.discount)) || 0) / roomIds.length

      for (const roomId of roomIds) {
        // Check room availability
        const room = await tx.room.findUnique({
          where: { id: roomId },
        })

        if (!room) {
          throw new RoomUnavailableError(roomId, 'Room not found')
        }

        if (room.status === 'MAINTENANCE') {
          throw new RoomUnavailableError(roomId, `Room ${room.roomNumber} is under maintenance`)
        }

        // Check for date conflicts
        const conflictCheck = await checkDateConflicts(
          roomId,
          checkInDate,
          checkOutDate
        )

        if (conflictCheck.hasConflict) {
          throw new DateConflictError(
            `Room ${room.roomNumber} is already booked from ${conflictCheck.conflictingBooking?.checkIn} to ${conflictCheck.conflictingBooking?.checkOut}`
          )
        }

        // Create a default FULL_DAY slot
        const checkInDateOnly = new Date(checkInDate)
        checkInDateOnly.setHours(0, 0, 0, 0)

        const slot = await tx.roomSlot.create({
          data: {
            roomId: roomId,
            date: checkInDateOnly,
            slotType: 'FULL_DAY',
            price: room.basePrice,
            isAvailable: false,
          },
        })

        // Calculate price for this room
        const priceCalculation = calculateBookingPrice(
          room.basePrice,
          checkInDate,
          checkOutDate,
          discountPerRoom
        )

        const applyGst = data.applyGst === true
        const effectiveTax = applyGst ? priceCalculation.tax : 0
        const effectiveTotal = applyGst ? priceCalculation.totalAmount : priceCalculation.subtotal

        // Generate custom booking ID and short reference for "view my booking"
        const [bookingId, bookingReference] = await Promise.all([
          generateBookingId(tx),
          generateBookingReference(tx),
        ])

        // Calculate advance and balance for this booking
        const advancePerRoom = (parseFloat(String(data.advanceAmount)) || 0) / roomIds.length
        const gstPerRoom = (parseFloat(String(data.gstAmount)) || 0) / roomIds.length
        const balanceForRoom = effectiveTotal - advancePerRoom

        // Generate bill number
        const billNumber = `BILL-${Date.now()}-${roomId.slice(-4)}`

        // Create booking with billing info (merged Bill fields)
        const booking = await tx.booking.create({
          data: {
            id: bookingId,
            roomId: roomId,
            slotId: slot.id,
            guestId: guest.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            flexibleCheckout: data.flexibleCheckout || false,
            numberOfGuests: parseInt(String(data.numberOfGuests)) || 1,
            totalAmount: effectiveTotal,
            advanceAmount: advancePerRoom,
            balanceAmount: Math.max(0, balanceForRoom),
            gstAmount: gstPerRoom,
            applyGst,
            status: 'CONFIRMED',
            source: 'STAFF', // Management site (hoteltheretinue.in)
            bookingReference,
            // Billing fields (merged from Bill)
            billNumber,
            subtotal: priceCalculation.subtotal,
            tax: effectiveTax,
            discount: priceCalculation.discountAmount,
            paidAmount: advancePerRoom,
            paymentStatus: advancePerRoom >= effectiveTotal ? 'PAID' : (advancePerRoom > 0 ? 'PARTIAL' : 'PENDING'),
          },
          include: {
            room: true,
            slot: true,
            guest: true,
          },
        })

        // Update room status only if check-in is today or in the past
        // For future bookings, room remains AVAILABLE until check-in
        const now = new Date()
        const isCurrentOrPastBooking = checkInDate <= now
        if (isCurrentOrPastBooking) {
          await tx.room.update({
            where: { id: roomId },
            data: { status: 'BOOKED' },
          })
        }

        // Log booking creation with payment details (use tx so history is in same transaction)
        await logBookingChange(
          booking.id,
          'CREATED',
          userId,
          [
            { field: 'status', oldValue: null, newValue: 'CONFIRMED' },
            { field: 'roomId', oldValue: null, newValue: roomId },
            { field: 'checkIn', oldValue: null, newValue: checkInDate },
            { field: 'checkOut', oldValue: null, newValue: checkOutDate },
            { field: 'totalAmount', oldValue: null, newValue: effectiveTotal },
            { field: 'subtotal', oldValue: null, newValue: priceCalculation.subtotal },
            { field: 'tax', oldValue: null, newValue: effectiveTax },
            { field: 'discount', oldValue: null, newValue: priceCalculation.discountAmount },
            { field: 'advanceAmount', oldValue: null, newValue: advancePerRoom },
            { field: 'paidAmount', oldValue: null, newValue: advancePerRoom },
            { field: 'paymentStatus', oldValue: null, newValue: advancePerRoom >= effectiveTotal ? 'PAID' : (advancePerRoom > 0 ? 'PARTIAL' : 'PENDING') },
            { field: 'billNumber', oldValue: null, newValue: billNumber },
          ],
          `Booking created for Room ${room.roomNumber}. Total ₹${effectiveTotal.toLocaleString()}, advance ₹${advancePerRoom.toLocaleString()} (${advancePerRoom >= effectiveTotal ? 'PAID' : advancePerRoom > 0 ? 'PARTIAL' : 'PENDING'}).`,
          tx
        )

        bookings.push(booking)
      }

      return { bookings, guest }
    }, {
      maxWait: 10000, // Max time to wait for transaction to start
      timeout: 30000, // Max time for transaction to complete (30s for slow Neon connections)
    })

    // Return response based on number of rooms
    if (result.bookings.length === 1) {
      return Response.json(
        successResponse(
          result.bookings[0],
          'Booking created successfully'
        )
      )
    }

    // Multiple rooms booked
    const totalAmount = result.bookings.reduce((sum: number, booking: any) => sum + booking.totalAmount, 0)
    return Response.json(
      successResponse(
        {
          bookings: result.bookings,
          totalRooms: result.bookings.length,
          totalAmount,
          guest: result.guest,
        },
        `${result.bookings.length} rooms booked successfully`
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
