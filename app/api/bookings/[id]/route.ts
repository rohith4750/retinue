import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// Types - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
import { validateStatusTransition } from '@/lib/booking-state-machine'
import { BookingError, InvalidStatusTransitionError } from '@/lib/booking-errors'
import { logBookingChange } from '@/lib/booking-audit'
import { calculateEarlyCheckoutAmount } from '@/lib/booking-validators'
import { notifyInternalBookingStep } from '@/lib/booking-alerts'
import type { BookingStep } from '@/lib/email'

// GET /api/bookings/[id] - Get single booking with history (Phase 3)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        slot: true,
        guest: true,
        history: {
          orderBy: { timestamp: 'desc' },
          take: 10, // Last 10 history entries
        },
      },
    })

    if (!booking) {
      return Response.json(
        errorResponse('Not found', 'Booking not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(booking))
  } catch (error) {
    console.error('Error fetching booking:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch booking'),
      { status: 500 }
    )
  }
}

// PUT /api/bookings/[id] - Update booking with Phase 2-3 improvements
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const userId = (authResult as any).userId
    const data = await request.json()
    const {
      status,
      checkIn,
      checkOut,
      roomId,
      guestName,
      guestPhone,
      guestIdProof,
      guestIdProofType,
      guestAddress,
      guestType,
      numberOfGuests,
      flexibleCheckout,
    } = data

    // Phase 2: Transaction management with extended timeout for slow connections
    const result = await prisma.$transaction(async (tx: any) => {
      // Get current booking
      const currentBooking = await tx.booking.findUnique({
        where: { id: params.id },
        include: {
          room: true,
          slot: true,
          guest: true,
        },
      })

      if (!currentBooking) {
        throw new Error('Booking not found')
      }

      const changes: any[] = []
      const updateData: any = {}

      // Guest info update (edit booking – same fields as Add page)
      const guestUpdates: Record<string, any> = {}
      if (guestName != null && guestName !== currentBooking.guest?.name) {
        guestUpdates.name = guestName
        changes.push({ field: 'guest.name', oldValue: currentBooking.guest?.name, newValue: guestName })
      }
      if (guestPhone != null && guestPhone !== currentBooking.guest?.phone) {
        guestUpdates.phone = guestPhone
        changes.push({ field: 'guest.phone', oldValue: currentBooking.guest?.phone, newValue: guestPhone })
      }
      if (guestIdProof !== undefined && guestIdProof !== currentBooking.guest?.idProof) {
        guestUpdates.idProof = guestIdProof || null
        changes.push({ field: 'guest.idProof', oldValue: currentBooking.guest?.idProof, newValue: guestIdProof })
      }
      if (guestIdProofType != null && guestIdProofType !== currentBooking.guest?.idProofType) {
        guestUpdates.idProofType = guestIdProofType
        changes.push({ field: 'guest.idProofType', oldValue: currentBooking.guest?.idProofType, newValue: guestIdProofType })
      }
      if (guestAddress !== undefined && guestAddress !== currentBooking.guest?.address) {
        guestUpdates.address = guestAddress || null
        changes.push({ field: 'guest.address', oldValue: currentBooking.guest?.address, newValue: guestAddress })
      }
      if (guestType != null && guestType !== currentBooking.guest?.guestType) {
        guestUpdates.guestType = guestType
        changes.push({ field: 'guest.guestType', oldValue: currentBooking.guest?.guestType, newValue: guestType })
      }
      if (Object.keys(guestUpdates).length > 0 && currentBooking.guestId) {
        await tx.guest.update({
          where: { id: currentBooking.guestId },
          data: guestUpdates,
        })
      }

      if (numberOfGuests != null && Number(numberOfGuests) !== currentBooking.numberOfGuests) {
        updateData.numberOfGuests = Number(numberOfGuests)
        changes.push({ field: 'numberOfGuests', oldValue: currentBooking.numberOfGuests, newValue: updateData.numberOfGuests })
      }
      if (typeof flexibleCheckout === 'boolean' && flexibleCheckout !== currentBooking.flexibleCheckout) {
        updateData.flexibleCheckout = flexibleCheckout
        changes.push({ field: 'flexibleCheckout', oldValue: currentBooking.flexibleCheckout, newValue: flexibleCheckout })
      }

      // Phase 2: Status update with state machine validation
      if (status && status !== currentBooking.status) {
        try {
          validateStatusTransition(currentBooking.status as BookingStatus, status as BookingStatus)
          updateData.status = status
          changes.push({
            field: 'status',
            oldValue: currentBooking.status,
            newValue: status,
          })
        } catch (error) {
          if (error instanceof InvalidStatusTransitionError) {
            throw error
          }
        }
      }

      // Early checkout: recalculate amount (< 12h = minimum charge, >= 12h = day rate). Receptionist finalizes payment.
      if (status === 'CHECKED_OUT') {
        const actualCheckOut =
          data.actualCheckOut != null
            ? new Date(data.actualCheckOut)
            : data.checkOut != null
              ? new Date(data.checkOut)
              : new Date()
        const isEarlyCheckout = actualCheckOut.getTime() < currentBooking.checkOut.getTime()
        if (isEarlyCheckout && currentBooking.room?.basePrice != null) {
          const early = calculateEarlyCheckoutAmount(
            currentBooking.checkIn,
            actualCheckOut,
            currentBooking.room.basePrice,
            currentBooking.applyGst !== false
          )
          updateData.checkOut = actualCheckOut
          updateData.totalAmount = early.totalAmount
          updateData.subtotal = early.subtotal
          updateData.tax = early.tax
          const paid = currentBooking.paidAmount || 0
          const balance = Math.max(0, early.totalAmount - paid)
          updateData.balanceAmount = balance
          updateData.paymentStatus =
            balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING'
          changes.push(
            { field: 'checkOut', oldValue: currentBooking.checkOut, newValue: actualCheckOut },
            {
              field: 'totalAmount',
              oldValue: currentBooking.totalAmount,
              newValue: early.totalAmount,
              note: early.breakdown,
            }
          )
        } else if (actualCheckOut.getTime() !== currentBooking.checkOut.getTime()) {
          updateData.checkOut = actualCheckOut
          changes.push({
            field: 'checkOut',
            oldValue: currentBooking.checkOut,
            newValue: actualCheckOut,
          })
        }
      }

      // Phase 3: Allow date modifications
      if (checkIn && new Date(checkIn).getTime() !== currentBooking.checkIn.getTime()) {
        updateData.checkIn = new Date(checkIn)
        changes.push({
          field: 'checkIn',
          oldValue: currentBooking.checkIn,
          newValue: new Date(checkIn),
        })
      }

      // CheckOut change (skip when status is CHECKED_OUT; early-checkout block above handles that)
      if (checkOut && new Date(checkOut).getTime() !== currentBooking.checkOut.getTime() && status !== 'CHECKED_OUT') {
        const newCheckOut = new Date(checkOut)
        updateData.checkOut = newCheckOut
        changes.push({
          field: 'checkOut',
          oldValue: currentBooking.checkOut,
          newValue: newCheckOut,
        })

        // If extending stay, recalculate total amount
        if (data.action === 'EXTEND_STAY' && newCheckOut > currentBooking.checkOut) {
          const room = currentBooking.room
          const oldDays = Math.ceil((currentBooking.checkOut.getTime() - currentBooking.checkIn.getTime()) / (1000 * 60 * 60 * 24))
          const newDays = Math.ceil((newCheckOut.getTime() - currentBooking.checkIn.getTime()) / (1000 * 60 * 60 * 24))
          const additionalDays = newDays - oldDays
          
          // Use room's basePrice for additional days calculation
          if (additionalDays > 0 && room?.basePrice) {
            const additionalAmount = additionalDays * room.basePrice
            const newSubtotal = (currentBooking.subtotal || currentBooking.totalAmount) + additionalAmount
            const newTax = currentBooking.applyGst ? Math.round(newSubtotal * 0.18) : 0
            const newTotal = newSubtotal + newTax - (currentBooking.discount || 0)
            const newBalance = newTotal - (currentBooking.paidAmount || 0)
            
            updateData.subtotal = newSubtotal
            updateData.tax = newTax
            updateData.totalAmount = newTotal
            updateData.balanceAmount = newBalance
            updateData.paymentStatus = newBalance <= 0 ? 'PAID' : (currentBooking.paidAmount || 0) > 0 ? 'PARTIAL' : 'PENDING'
            
            changes.push({
              field: 'totalAmount',
              oldValue: currentBooking.totalAmount,
              newValue: newTotal,
              note: `Extended stay by ${additionalDays} day(s), additional ₹${additionalAmount}`,
            })
          }
        }
      }

      // Phase 3: Allow room change (if not checked in)
      if (roomId && roomId !== currentBooking.roomId && currentBooking.status !== 'CHECKED_IN') {
        const newRoom = await tx.room.findUnique({
          where: { id: roomId },
        })

        if (!newRoom || newRoom.status === 'MAINTENANCE') {
          throw new Error('New room is not available')
        }

        // Check new room has no overlapping booking for same dates
        const conflict = await tx.booking.findFirst({
          where: {
            roomId,
            id: { not: params.id },
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            OR: [
              {
                checkIn: { lte: currentBooking.checkOut },
                checkOut: { gte: currentBooking.checkIn },
              },
            ],
          },
        })
        if (conflict) {
          throw new Error('New room is already booked for these dates')
        }

        // Create new slot for new room (same date as current booking)
        const checkInDateOnly = new Date(currentBooking.checkIn)
        checkInDateOnly.setHours(0, 0, 0, 0)
        const newSlot = await tx.roomSlot.create({
          data: {
            roomId,
            date: checkInDateOnly,
            slotType: 'FULL_DAY',
            price: newRoom.basePrice,
            isAvailable: false,
          },
        })
        updateData.roomId = roomId
        updateData.slotId = newSlot.id
        changes.push(
          { field: 'roomId', oldValue: currentBooking.roomId, newValue: roomId },
          { field: 'slotId', oldValue: currentBooking.slotId, newValue: newSlot.id },
        )
      }

      // Update booking if there are changes
      if (Object.keys(updateData).length === 0) {
        if (changes.length > 0) {
          await logBookingChange(
            params.id,
            'UPDATED',
            userId,
            changes,
            'Guest or booking details updated',
            tx
          )
        }
        const refreshed = await tx.booking.findUnique({
          where: { id: params.id },
          include: { room: true, slot: true, guest: true },
        })
        return refreshed ?? currentBooking
      }

      const updatedBooking = await tx.booking.update({
        where: { id: params.id },
        data: updateData,
        include: {
          room: true,
          slot: true,
          guest: true,
        },
      })

      // Phase 2: Handle status changes
      if (status === 'CHECKED_OUT') {
        // Use updated booking's slot/room (in case room was changed)
        const slotIdToFree = updateData.slotId ?? currentBooking.slotId
        const roomIdToFree = updateData.roomId ?? currentBooking.roomId
        if (slotIdToFree) {
          await tx.roomSlot.update({
            where: { id: slotIdToFree },
            data: { isAvailable: true },
          })
        }
        await tx.room.update({
          where: { id: roomIdToFree },
          data: { status: 'AVAILABLE' },
        })
      } else if (status === 'CHECKED_IN') {
        const roomIdToBook = updateData.roomId ?? currentBooking.roomId
        await tx.room.update({
          where: { id: roomIdToBook },
          data: { status: 'BOOKED' },
        })
      }

      // When room was changed: free old slot and old room
      if (updateData.roomId && currentBooking.roomId !== updateData.roomId) {
        if (currentBooking.slotId) {
          await tx.roomSlot.update({
            where: { id: currentBooking.slotId },
            data: { isAvailable: true },
          })
        }
        // Free old room only if no other active booking uses it
        const otherOnOldRoom = await tx.booking.count({
          where: {
            roomId: currentBooking.roomId,
            id: { not: params.id },
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          },
        })
        if (otherOnOldRoom === 0) {
          await tx.room.update({
            where: { id: currentBooking.roomId },
            data: { status: 'AVAILABLE' },
          })
        }
      }

      // Phase 3: Log changes to audit trail
      if (changes.length > 0) {
        // Determine the action type based on what was changed
        let actionType = 'UPDATED'
        let notes = 'Booking updated'
        
        if (status) {
          actionType = 'STATUS_CHANGED'
          notes = `Status changed to ${status}`
        } else if (data.action === 'EXTEND_STAY') {
          actionType = 'STAY_EXTENDED'
          const extendChange = changes.find((c: any) => c.field === 'totalAmount')
          notes = extendChange?.note || 'Stay extended'
        }
        
        await logBookingChange(
          params.id,
          actionType,
          userId,
          changes,
          notes,
          tx
        )
      }

      return { updatedBooking, status, changes }
    }, {
      maxWait: 10000, // Max time to wait for transaction to start
      timeout: 30000, // Max time for transaction to complete (30s for slow Neon connections)
    })

    const updatedBooking = (result as { updatedBooking: any; status?: string; changes: any[] }).updatedBooking
    const statusChanged = (result as { status?: string }).status
    const changes = (result as { changes: any[] }).changes ?? []
    const authUser = authResult as { username?: string }

    if (changes.length > 0) {
      const step: BookingStep =
        statusChanged && ['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'CONFIRMED', 'PENDING'].includes(statusChanged)
          ? (statusChanged as BookingStep)
          : 'UPDATED'
      await notifyInternalBookingStep({
        step,
        bookingReference: updatedBooking.bookingReference ?? updatedBooking.id,
        guestName: updatedBooking.guest?.name ?? '',
        guestPhone: updatedBooking.guest?.phone ?? '',
        roomNumber: updatedBooking.room?.roomNumber ?? '',
        roomType: updatedBooking.room?.roomType,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        totalAmount: updatedBooking.totalAmount,
        performedByUsername: authUser?.username,
      })
    }

    return Response.json(successResponse(updatedBooking, 'Booking updated successfully'))
  } catch (error: any) {
    // Phase 2: Comprehensive error handling
    if (error instanceof BookingError) {
      return Response.json(
        errorResponse(error.code, error.message),
        { status: error.statusCode }
      )
    }

    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Booking not found'),
        { status: 404 }
      )
    }

    console.error('Error updating booking:', error)
    return Response.json(
      errorResponse('INTERNAL_ERROR', error.message || 'Failed to update booking'),
      { status: 500 }
    )
  }
}

// DELETE /api/bookings/[id] - Cancel or permanently delete booking
// Query param: ?permanent=true for hard delete (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    // Permanent delete requires Admin, cancel requires Receptionist
    const authResult = permanent 
      ? await requireAuth('ADMIN')(request)
      : await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const userId = (authResult as any).userId

    // Permanent delete - completely remove booking and related records
    if (permanent) {
      await prisma.$transaction(async (tx: any) => {
        const booking = await tx.booking.findUnique({
          where: { id: params.id },
          include: { room: true, slot: true },
        })

        if (!booking) {
          throw new Error('Booking not found')
        }

        // Delete booking history
        await tx.bookingHistory.deleteMany({
          where: { bookingId: params.id },
        })

        // Delete the booking
        await tx.booking.delete({
          where: { id: params.id },
        })

        // Make slot available again if it exists
        if (booking.slotId) {
          await tx.roomSlot.update({
            where: { id: booking.slotId },
            data: { isAvailable: true },
          }).catch(() => {}) // Ignore if slot doesn't exist
        }

        // Update room status if it was booked for this booking
        if (booking.status === 'CHECKED_IN' || booking.status === 'CONFIRMED') {
          await tx.room.update({
            where: { id: booking.roomId },
            data: { status: 'AVAILABLE' },
          })
        }
      }, {
        maxWait: 10000,
        timeout: 30000,
      })

      return Response.json(successResponse(null, 'Booking permanently deleted'))
    }

    // Soft delete (cancel) - keep booking record but change status
    const result = await prisma.$transaction(async (tx: any) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.id },
        include: {
          room: true,
          slot: true,
        },
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      // Phase 2: Validate cancellation is allowed
      if (booking.status === 'CHECKED_OUT') {
        throw new Error('Cannot cancel a checked-out booking')
      }

      // Update booking status to CANCELLED
      const cancelledBooking = await tx.booking.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' },
        include: {
          room: true,
          slot: true,
          guest: true,
        },
      })

      // Make slot and room available again
      if (booking.slotId) {
        await tx.roomSlot.update({
          where: { id: booking.slotId },
          data: { isAvailable: true },
        })
      }

      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'AVAILABLE' },
      })

      // Phase 3: Log cancellation (use tx so history is in same transaction)
      await logBookingChange(
        params.id,
        'CANCELLED',
        userId,
        [
          { field: 'status', oldValue: booking.status, newValue: 'CANCELLED' },
        ],
        'Booking cancelled',
        tx
      )

      return cancelledBooking
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    const authUser = authResult as { username?: string }
    await notifyInternalBookingStep({
      step: 'CANCELLED',
      bookingReference: result.bookingReference ?? result.id,
      guestName: result.guest?.name ?? '',
      guestPhone: result.guest?.phone ?? '',
      roomNumber: result.room?.roomNumber ?? '',
      roomType: result.room?.roomType,
      checkIn: result.checkIn,
      checkOut: result.checkOut,
      totalAmount: result.totalAmount,
      performedByUsername: authUser?.username,
    })

    return Response.json(successResponse(result, 'Booking cancelled successfully'))
  } catch (error: any) {
    if (error instanceof BookingError) {
      return Response.json(
        errorResponse(error.code, error.message),
        { status: error.statusCode }
      )
    }

    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Booking not found'),
        { status: 404 }
      )
    }

    console.error('Error deleting booking:', error)
    return Response.json(
      errorResponse('INTERNAL_ERROR', error.message || 'Failed to delete booking'),
      { status: 500 }
    )
  }
}
