import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { verifyCustomerToken, extractTokenFromHeader } from '@/lib/jwt'

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

/**
 * GET /api/public/bookings/history
 * Returns booking history for the logged-in customer (public site).
 * Requires: Authorization: Bearer <customerToken>
 * Token is returned from signup or verify-otp (when user is already a customer).
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifyCustomerToken(token) : null

    if (!payload || payload.purpose !== 'CUSTOMER_SESSION') {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Invalid or expired session. Please sign in again.'),
        { status: 401 }
      )
    }

    const customer = await (prisma as any).customer.findUnique({
      where: { id: payload.customerId },
      select: { id: true, phone: true },
    })

    if (!customer) {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Customer not found. Please sign in again.'),
        { status: 401 }
      )
    }

    const customerPhoneNorm = normalizePhone(customer.phone)

    const bookings = await prisma.booking.findMany({
      where: { source: 'ONLINE' } as any,
      include: {
        room: { select: { roomNumber: true, roomType: true } },
        guest: { select: { name: true, phone: true } },
      },
      orderBy: { bookingDate: 'desc' },
    }) as unknown as Array<{
      id: string
      bookingReference: string | null
      checkIn: Date
      checkOut: Date
      status: string
      paymentStatus: string
      totalAmount: number
      paidAmount: number
      balanceAmount: number | null
      numberOfGuests: number
      bookingDate: Date
      guest: { name: string; phone: string }
      room: { roomNumber: string; roomType: string }
    }>

    const filtered = bookings.filter(
      (b) => normalizePhone(b.guest.phone) === customerPhoneNorm
    )

    const list = filtered.map((b) => ({
      bookingId: b.id,
      bookingReference: b.bookingReference,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      paymentStatus: b.paymentStatus,
      totalAmount: b.totalAmount,
      paidAmount: b.paidAmount,
      balanceAmount: b.balanceAmount,
      guestName: b.guest.name,
      guestPhone: b.guest.phone,
      roomNumber: b.room.roomNumber,
      roomType: b.room.roomType,
      numberOfGuests: b.numberOfGuests,
      bookingDate: b.bookingDate,
    }))

    return Response.json(
      successResponse({
        bookings: list,
        total: list.length,
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Booking history error:', error)
    return Response.json(
      errorResponse('SERVER_ERROR', 'Failed to fetch booking history'),
      { status: 500 }
    )
  }
}
