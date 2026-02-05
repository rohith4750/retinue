import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import {
  validateBookingDates,
  checkDateConflicts,
  calculateBookingPrice,
} from '@/lib/booking-validators'
import { DateConflictError, RoomUnavailableError } from '@/lib/booking-errors'
import { logBookingChange } from '@/lib/booking-audit'
import { generateBookingId, generateBookingReference } from '@/lib/booking-id-generator'

import { createBookingSchema } from '@/lib/booking-validators'

/**
 * POST /api/public/bookings/batch
 * Create multiple room bookings in one atomic transaction (single reference for all rooms).
 * Body: roomIds[], guestName, guestPhone, checkIn, checkOut, numberOfGuests?, guestAddress?, guestIdProof?, discount?
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const roomIds: string[] = Array.isArray(data.roomIds)
      ? data.roomIds.filter((id: unknown) => typeof id === 'string')
      : typeof data.roomIds === 'string' ? [data.roomIds] : []

    if (!roomIds.length) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'roomIds (array) is required'),
        { status: 400 }
      )
    }

    const uniqueRoomIds = Array.from(new Set(roomIds))

    const validationResult = createBookingSchema.safeParse({
      roomId: uniqueRoomIds[0],
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestIdProof: data.guestIdProof,
      guestAddress: data.guestAddress,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      totalAmount: 0,
      discount: parseFloat(data.discount) || 0,
    })

    if (!validationResult.success) {
      return Response.json(
        errorResponse(
          'VALIDATION_ERROR',
          validationResult.error.errors[0]?.message || 'Invalid input'
        ),
        { status: 400 }
      )
    }

    const validatedData = validationResult.data
    let checkInDate = new Date(validatedData.checkIn)
    let checkOutDate = new Date(validatedData.checkOut)

    if (validatedData.checkIn.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkInDate.setHours(0, 0, 0, 0)
    }
    if (validatedData.checkOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkOutDate.setHours(23, 59, 59, 999)
    }

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Invalid check-in or check-out date'),
        { status: 400 }
      )
    }

    const dateValidation = validateBookingDates(checkInDate, checkOutDate)
    if (!dateValidation.valid) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', dateValidation.error || 'Invalid dates'),
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx: any) => {
        const guest = await tx.guest.create({
          data: {
            name: validatedData.guestName,
            phone: validatedData.guestPhone,
            idProof: validatedData.guestIdProof,
            idProofType: data.guestIdProofType || 'AADHAR',
            guestType: 'WALK_IN',
            address: validatedData.guestAddress,
          },
        })

        const groupRef = await generateBookingReference(tx)
        const checkInDateOnly = new Date(checkInDate)
        checkInDateOnly.setHours(0, 0, 0, 0)

        const rooms: Array<{ roomId: string; roomNumber: string; roomType: string }> = []
        const bookings: any[] = []
        let totalAmountSum = 0

        for (let i = 0; i < uniqueRoomIds.length; i++) {
          const roomId = uniqueRoomIds[i] as string
          const room = await tx.room.findUnique({ where: { id: roomId } })

          if (!room) {
            throw new RoomUnavailableError(roomId, 'Room not found')
          }
          if (room.status === 'MAINTENANCE') {
            throw new RoomUnavailableError(roomId, `Room ${room.roomNumber} is under maintenance`)
          }

          const conflictCheck = await checkDateConflicts(roomId, checkInDate, checkOutDate, undefined, tx)
          if (conflictCheck.hasConflict) {
            throw new DateConflictError(
              `Room ${room.roomNumber} is already booked for the selected dates`
            )
          }

          const slot = await tx.roomSlot.create({
            data: {
              roomId,
              date: checkInDateOnly,
              slotType: 'FULL_DAY',
              price: room.basePrice,
              isAvailable: false,
            },
          })

          const priceCalculation = calculateBookingPrice(
            room.basePrice,
            checkInDate,
            checkOutDate,
            parseFloat(String(data.discount)) || 0
          )
          const applyGst = data.applyGst !== false
          const effectiveTax = applyGst ? priceCalculation.tax : 0
          const effectiveTotal = applyGst ? priceCalculation.totalAmount : priceCalculation.subtotal
          const advancePerRoom = parseFloat(String(data.advanceAmount)) || 0
          const balanceForRoom = effectiveTotal - advancePerRoom
          const gstPerRoom = applyGst ? priceCalculation.tax : 0

          totalAmountSum += effectiveTotal

          const bookingId = await generateBookingId(tx)
          const bookingReference = i === 0 ? groupRef : `${groupRef}-${i + 1}`
          const billNumber = `BILL-${Date.now()}-${roomId.slice(-4)}-${i}`

          const booking = await tx.booking.create({
            data: {
              id: bookingId,
              roomId,
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
              source: 'ONLINE',
              bookingReference,
              groupBookingReference: groupRef,
              billNumber,
              subtotal: priceCalculation.subtotal,
              tax: effectiveTax,
              discount: priceCalculation.discountAmount,
              paidAmount: advancePerRoom,
              paymentStatus:
                advancePerRoom >= effectiveTotal
                  ? 'PAID'
                  : advancePerRoom > 0
                    ? 'PARTIAL'
                    : 'PENDING',
            },
            include: { room: true, guest: true },
          })

          bookings.push(booking)
          rooms.push({
            roomId: room.id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
          })

          await logBookingChange(
            booking.id,
            'CREATED',
            undefined,
            [
              { field: 'source', oldValue: null, newValue: 'ONLINE' },
              { field: 'bookingReference', oldValue: null, newValue: bookingReference },
              { field: 'groupBookingReference', oldValue: null, newValue: groupRef },
              { field: 'checkIn', oldValue: null, newValue: checkInDate },
              { field: 'checkOut', oldValue: null, newValue: checkOutDate },
              { field: 'totalAmount', oldValue: null, newValue: effectiveTotal },
            ],
            `Batch booking (${i + 1}/${uniqueRoomIds.length}). Reference: ${groupRef}.`,
            tx
          )
        }

        return {
          bookingReference: groupRef,
          mainBookingId: bookings[0]?.id,
          guestName: guest.name,
          guestPhone: guest.phone,
          rooms,
          totalAmount: totalAmountSum,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: 'CONFIRMED' as const,
          bookings,
        }
      },
      { maxWait: 15000, timeout: 45000 }
    )

    return Response.json(
      successResponse({
        bookingReference: result.bookingReference,
        bookingId: result.mainBookingId,
        rooms: result.rooms,
        totalAmount: result.totalAmount,
        checkIn: result.checkIn,
        checkOut: result.checkOut,
        status: result.status,
        guestName: result.guestName,
        guestPhone: result.guestPhone,
        message: 'Booking created. Save your booking reference to view your booking.',
      }),
      { status: 201 }
    )
  } catch (error: any) {
    if (error?.statusCode) {
      return Response.json(
        errorResponse(error.code || 'BOOKING_ERROR', error.message),
        { status: error.statusCode }
      )
    }
    console.error('Batch booking error:', error)
    return Response.json(
      errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    )
  }
}
