import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/function-hall-bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const booking = await prisma.functionHallBooking.findUnique({
      where: { id: params.id },
      include: {
        hall: true
      }
    })

    if (!booking) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Booking not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(booking))
  } catch (error) {
    console.error('Error fetching function hall booking:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch booking'),
      { status: 500 }
    )
  }
}

// PUT /api/function-hall-bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const {
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
      status
    } = data

    // Check if booking exists
    const existingBooking = await prisma.functionHallBooking.findUnique({
      where: { id: params.id }
    })

    if (!existingBooking) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Booking not found'),
        { status: 404 }
      )
    }

    // Calculate balance if amounts changed
    let balanceAmount = existingBooking.balanceAmount
    if (totalAmount !== undefined || advanceAmount !== undefined) {
      const total = totalAmount !== undefined ? parseFloat(totalAmount) : existingBooking.totalAmount
      const advance = advanceAmount !== undefined ? parseFloat(advanceAmount) : existingBooking.advanceAmount
      balanceAmount = total - advance
    }

    const booking = await prisma.functionHallBooking.update({
      where: { id: params.id },
      data: {
        ...(customerName && { customerName }),
        ...(customerPhone && { customerPhone }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(eventType && { eventType }),
        ...(eventDate && { eventDate: new Date(eventDate) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(expectedGuests && { expectedGuests: parseInt(expectedGuests) }),
        ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount) }),
        ...(advanceAmount !== undefined && { advanceAmount: parseFloat(advanceAmount) }),
        balanceAmount,
        ...(specialRequests !== undefined && { specialRequests }),
        ...(status && { status }),
      },
      include: {
        hall: true
      }
    })

    return Response.json(successResponse(booking, 'Booking updated successfully'))
  } catch (error: any) {
    console.error('Error updating function hall booking:', error)
    return Response.json(
      errorResponse('Server error', error.message || 'Failed to update booking'),
      { status: 500 }
    )
  }
}

// DELETE /api/function-hall-bookings/[id] - Cancel or delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    const authResult = permanent
      ? await requireAuth('ADMIN')(request)
      : await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    if (permanent) {
      // Permanent delete
      await prisma.functionHallBooking.delete({
        where: { id: params.id }
      })
      return Response.json(successResponse(null, 'Booking deleted permanently'))
    } else {
      // Soft delete (cancel)
      const booking = await prisma.functionHallBooking.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' }
      })
      return Response.json(successResponse(booking, 'Booking cancelled successfully'))
    }
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('NOT_FOUND', 'Booking not found'),
        { status: 404 }
      )
    }
    console.error('Error deleting function hall booking:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete booking'),
      { status: 500 }
    )
  }
}
