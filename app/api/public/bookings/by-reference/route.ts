import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'

/** Normalize phone for comparison: digits only; accept full match or last 4 digits */
function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

function phoneMatches(guestPhone: string, providedPhone: string): boolean {
  const guestDigits = normalizePhone(guestPhone)
  const providedDigits = normalizePhone(providedPhone)
  if (guestDigits.length < 4 || providedDigits.length < 4) return false
  // Full 10-digit match
  if (guestDigits === providedDigits) return true
  // Last 4 digits match (guest phone ends with provided last 4)
  const last4 = providedDigits.slice(-4)
  return guestDigits.slice(-4) === last4
}

/**
 * GET /api/public/bookings/by-reference
 * View booking by reference + phone (no auth). Query: bookingReference, phone.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingReference = searchParams.get('bookingReference')?.trim().toUpperCase()
    const phone = searchParams.get('phone')?.trim()

    if (!bookingReference || !phone) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'bookingReference and phone are required'),
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingReference },
      include: {
        room: true,
        guest: true,
      },
    })

    if (!booking) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Booking not found'),
        { status: 404 }
      )
    }

    if (!phoneMatches(booking.guest.phone, phone)) {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Phone does not match this booking'),
        { status: 403 }
      )
    }

    return Response.json(
      successResponse({
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
        paidAmount: booking.paidAmount,
        balanceAmount: booking.balanceAmount,
        guestName: booking.guest.name,
        guestPhone: booking.guest.phone,
        roomNumber: booking.room.roomNumber,
        roomType: booking.room.roomType,
        numberOfGuests: booking.numberOfGuests,
      })
    )
  } catch (error) {
    console.error('Error fetching booking by reference:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch booking'),
      { status: 500 }
    )
  }
}
