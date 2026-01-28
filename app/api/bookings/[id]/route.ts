import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// Types - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST'
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
import { validateStatusTransition } from '@/lib/booking-state-machine'
import { BookingError, InvalidStatusTransitionError } from '@/lib/booking-errors'
import { logBookingChange } from '@/lib/booking-audit'

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
        bill: true,
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
    const { status, checkIn, checkOut, roomId } = data

    // Phase 2: Transaction management
    const result = await prisma.$transaction(async (tx: any) => {
      // Get current booking
      const currentBooking = await tx.booking.findUnique({
        where: { id: params.id },
        include: {
          room: true,
          slot: true,
          guest: true,
          bill: true,
        },
      })

      if (!currentBooking) {
        throw new Error('Booking not found')
      }

      const changes: any[] = []
      const updateData: any = {}

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

      // Phase 3: Allow date modifications
      if (checkIn && new Date(checkIn).getTime() !== currentBooking.checkIn.getTime()) {
        updateData.checkIn = new Date(checkIn)
        changes.push({
          field: 'checkIn',
          oldValue: currentBooking.checkIn,
          newValue: new Date(checkIn),
        })
      }

      if (checkOut && new Date(checkOut).getTime() !== currentBooking.checkOut.getTime()) {
        updateData.checkOut = new Date(checkOut)
        changes.push({
          field: 'checkOut',
          oldValue: currentBooking.checkOut,
          newValue: new Date(checkOut),
        })
      }

      // Phase 3: Allow room change (if not checked in)
      if (roomId && roomId !== currentBooking.roomId && currentBooking.status !== 'CHECKED_IN') {
        // Check if new room is available
        const newRoom = await tx.room.findUnique({
          where: { id: roomId },
        })

        if (!newRoom || newRoom.status === 'MAINTENANCE') {
          throw new Error('New room is not available')
        }

        updateData.roomId = roomId
        changes.push({
          field: 'roomId',
          oldValue: currentBooking.roomId,
          newValue: roomId,
        })
      }

      // Update booking if there are changes
      if (Object.keys(updateData).length === 0) {
        return currentBooking
      }

      const updatedBooking = await tx.booking.update({
        where: { id: params.id },
        data: updateData,
        include: {
          room: true,
          slot: true,
          guest: true,
          bill: true,
        },
      })

      // Phase 2: Handle status changes
      if (status === 'CHECKED_OUT') {
        // Make slot available again
        if (currentBooking.slotId) {
          await tx.roomSlot.update({
            where: { id: currentBooking.slotId },
            data: { isAvailable: true },
          })
        }

        // Update room status
        await tx.room.update({
          where: { id: currentBooking.roomId },
          data: { status: 'AVAILABLE' },
        })
      } else if (status === 'CHECKED_IN') {
        // Ensure room is marked as booked
        await tx.room.update({
          where: { id: currentBooking.roomId },
          data: { status: 'BOOKED' },
        })
      }

      // Phase 3: Log changes to audit trail
      if (changes.length > 0) {
        await logBookingChange(
          params.id,
          status ? 'STATUS_CHANGED' : 'UPDATED',
          userId,
          changes,
          status ? `Status changed to ${status}` : 'Booking updated'
        )
      }

      return updatedBooking
    })

    return Response.json(successResponse(result, 'Booking updated successfully'))
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

        // Delete bill if exists
        await tx.bill.deleteMany({
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
          bill: true,
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

      // Phase 3: Log cancellation
      await logBookingChange(
        params.id,
        'CANCELLED',
        userId,
        [
          { field: 'status', oldValue: booking.status, newValue: 'CANCELLED' },
        ],
        'Booking cancelled'
      )

      return cancelledBooking
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
