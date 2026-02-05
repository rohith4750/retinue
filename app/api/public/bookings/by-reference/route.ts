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
 * View booking by reference only (no auth). Query: bookingReference (phone optional for verification).
 * For batch (multi-room) bookings, returns all rooms under the same group reference.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('bookingReference')?.trim().toUpperCase()
    const phone = searchParams.get('phone')?.trim()

    if (!ref) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'bookingReference is required'),
        { status: 400 }
      )
    }

    // Find by primary reference or group reference (batch bookings)
    const first = await (prisma as any).booking.findFirst({
      where: {
        OR: [
          { bookingReference: ref },
          { groupBookingReference: ref },
        ],
      },
      include: { room: true, guest: true },
    })

    if (!first) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Booking not found'),
        { status: 404 }
      )
    }

    if (phone && !phoneMatches(first.guest.phone, phone)) {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Phone does not match this booking'),
        { status: 403 }
      )
    }

    const groupRef = first.groupBookingReference || first.bookingReference

    const allInGroup = await (prisma as any).booking.findMany({
      where: {
        OR: [
          { bookingReference: groupRef },
          { groupBookingReference: groupRef },
        ],
      },
      include: { room: true, guest: true },
      orderBy: { room: { roomNumber: 'asc' } },
    })

    const totalAmount = allInGroup.reduce((sum: number, b: any) => sum + b.totalAmount, 0)
    const paidAmount = allInGroup.reduce((sum: number, b: any) => sum + b.paidAmount, 0)
    const balanceAmount = allInGroup.reduce((sum: number, b: any) => sum + (b.balanceAmount ?? 0), 0)

    return Response.json(
      successResponse({
        bookingReference: groupRef,
        bookingId: first.id,
        checkIn: first.checkIn,
        checkOut: first.checkOut,
        status: first.status,
        paymentStatus: first.paymentStatus,
        totalAmount,
        paidAmount,
        balanceAmount: balanceAmount > 0 ? balanceAmount : undefined,
        guestName: first.guest.name,
        guestPhone: first.guest.phone,
        numberOfGuests: first.numberOfGuests,
        isBatch: allInGroup.length > 1,
        rooms: allInGroup.map((b: any) => ({
          bookingId: b.id,
          roomNumber: b.room.roomNumber,
          roomType: b.room.roomType,
          totalAmount: b.totalAmount,
          status: b.status,
        })),
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
