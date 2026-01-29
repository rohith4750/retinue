import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/bills/[id] - Get bill details (now uses Booking)
// id can be billNumber or bookingId
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    // Try to find by bookingId first, then by billNumber
    let booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        slot: true,
        guest: true,
        history: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    // If not found by id, try by billNumber
    if (!booking) {
      booking = await prisma.booking.findFirst({
        where: { billNumber: params.id },
        include: {
          room: true,
          slot: true,
          guest: true,
          history: {
            orderBy: { timestamp: 'asc' },
          },
        },
      })
    }

    if (!booking) {
      return Response.json(
        errorResponse('Not found', 'Bill not found'),
        { status: 404 }
      )
    }

    // Return in a format compatible with old Bill structure for frontend
    const billData = {
      id: booking.id,
      bookingId: booking.id,
      billNumber: booking.billNumber,
      subtotal: booking.subtotal,
      tax: booking.tax,
      discount: booking.discount,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      balanceAmount: booking.balanceAmount,
      advanceAmount: booking.advanceAmount,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      history: booking.history || [],
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: booking.status,
        room: booking.room,
        slot: booking.slot,
        guest: booking.guest,
      },
    }

    return Response.json(successResponse(billData))
  } catch (error) {
    console.error('Error fetching bill:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch bill'),
      { status: 500 }
    )
  }
}

// PUT /api/bills/[id] - Update payment (now updates Booking)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { paidAmount, paymentMode } = data

    if (paidAmount === undefined) {
      return Response.json(
        errorResponse('Validation error', 'Paid amount is required'),
        { status: 400 }
      )
    }

    const paymentReceived = parseFloat(paidAmount)
    const validModes = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'WALLET', 'CHEQUE']
    const mode = paymentMode && validModes.includes(String(paymentMode).toUpperCase())
      ? String(paymentMode).toUpperCase()
      : 'CASH'
    if (isNaN(paymentReceived) || paymentReceived < 0) {
      return Response.json(
        errorResponse('Validation error', 'Paid amount must be a non-negative number'),
        { status: 400 }
      )
    }

    // Try to find by bookingId first, then by billNumber
    let booking = await prisma.booking.findUnique({
      where: { id: params.id },
    })

    if (!booking) {
      booking = await prisma.booking.findFirst({
        where: { billNumber: params.id },
      })
    }

    if (!booking) {
      return Response.json(
        errorResponse('Not found', 'Bill not found'),
        { status: 404 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return Response.json(
        errorResponse('Validation error', 'Cannot record payment for a cancelled booking'),
        { status: 400 }
      )
    }

    const oldPaidAmount = booking.paidAmount
    const newPaidAmount = oldPaidAmount + paymentReceived
    const balanceAmount = booking.totalAmount - newPaidAmount
    const paymentStatus =
      balanceAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING'

    // Update booking and create payment history in a transaction
    const updatedBooking = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount,
          paymentStatus,
        },
        include: {
          room: true,
          slot: true,
          guest: true,
        },
      })
      
      // Record payment in history (include how they paid)
      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          action: 'PAYMENT_RECEIVED',
          changedBy: (authResult as any).userId || null,
          changes: {
            paidAmount: { from: oldPaidAmount, to: newPaidAmount },
            paymentReceived: paymentReceived,
            paymentMode: mode,
            paymentStatus: { from: booking.paymentStatus, to: paymentStatus },
          },
          notes: `Payment of ₹${paymentReceived.toLocaleString()} received (${mode.replace('_', ' ')})`,
        },
      })
      
      return updated
    }, {
      maxWait: 10000,
      timeout: 30000, // 30s timeout for slow Neon connections
    })

    // Return in compatible format
    const billData = {
      id: updatedBooking.id,
      bookingId: updatedBooking.id,
      billNumber: updatedBooking.billNumber,
      subtotal: updatedBooking.subtotal,
      tax: updatedBooking.tax,
      discount: updatedBooking.discount,
      totalAmount: updatedBooking.totalAmount,
      paidAmount: updatedBooking.paidAmount,
      balanceAmount: updatedBooking.balanceAmount,
      paymentStatus: updatedBooking.paymentStatus,
      createdAt: updatedBooking.createdAt,
      updatedAt: updatedBooking.updatedAt,
      booking: {
        id: updatedBooking.id,
        checkIn: updatedBooking.checkIn,
        checkOut: updatedBooking.checkOut,
        status: updatedBooking.status,
        room: updatedBooking.room,
        slot: updatedBooking.slot,
        guest: updatedBooking.guest,
      },
    }

    return Response.json(successResponse(billData, 'Payment updated successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('Not found', 'Bill not found'),
        { status: 404 }
      )
    }
    console.error('Error updating bill:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to update payment'),
      { status: 500 }
    )
  }
}
