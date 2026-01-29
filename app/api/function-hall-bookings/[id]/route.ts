import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { logHallBookingChange } from '@/lib/hall-booking-audit'

// GET /api/function-hall-bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const booking = await (prisma as any).functionHallBooking.findUnique({
      where: { id: params.id },
      include: {
        hall: true,
        history: { orderBy: { timestamp: 'asc' } },
      },
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
      status,
      // Electricity meter readings
      meterReadingBefore,
      meterReadingAfter,
      electricityUnitPrice,
      // Additional charges
      maintenanceCharges,
      otherCharges,
      otherChargesNote,
      // Payment recording
      addPayment,
    } = data

    // Check if booking exists
    const existingBooking = await (prisma as any).functionHallBooking.findUnique({
      where: { id: params.id }
    })

    if (!existingBooking) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Booking not found'),
        { status: 404 }
      )
    }

    // Calculate electricity charges if meter readings provided
    let unitsConsumed = existingBooking.unitsConsumed
    let electricityCharges = existingBooking.electricityCharges
    
    const meterBefore = meterReadingBefore !== undefined ? parseFloat(meterReadingBefore) : existingBooking.meterReadingBefore
    const meterAfter = meterReadingAfter !== undefined ? parseFloat(meterReadingAfter) : existingBooking.meterReadingAfter
    const unitPrice = electricityUnitPrice !== undefined ? parseFloat(electricityUnitPrice) : existingBooking.electricityUnitPrice
    
    if (meterBefore !== null && meterAfter !== null && unitPrice !== null) {
      unitsConsumed = meterAfter - meterBefore
      electricityCharges = unitsConsumed * unitPrice
    }

    // Calculate balance and grand total
    const hallAmount = totalAmount !== undefined ? parseFloat(totalAmount) : existingBooking.totalAmount
    
    // Handle payment: either set new advance amount or add to existing
    let advance = existingBooking.advanceAmount
    if (addPayment !== undefined) {
      // Adding a new payment to existing advance
      advance = existingBooking.advanceAmount + parseFloat(addPayment)
    } else if (advanceAmount !== undefined) {
      // Setting the advance amount directly
      advance = parseFloat(advanceAmount)
    }
    
    const maintenance = maintenanceCharges !== undefined ? parseFloat(maintenanceCharges) : (existingBooking.maintenanceCharges || 0)
    const other = otherCharges !== undefined ? parseFloat(otherCharges) : (existingBooking.otherCharges || 0)
    
    // Grand total = hall charges + electricity + maintenance + other
    const grandTotal = hallAmount + (electricityCharges || 0) + maintenance + other
    const balanceAmount = grandTotal - advance

    const userId = (authResult as any).userId
    const changes: { field: string; oldValue: any; newValue: any }[] = []
    if (status && status !== existingBooking.status) {
      changes.push({ field: 'status', oldValue: existingBooking.status, newValue: status })
    }
    if (totalAmount !== undefined) {
      const newTotal = parseFloat(totalAmount)
      if (newTotal !== existingBooking.totalAmount) {
        changes.push({ field: 'totalAmount', oldValue: existingBooking.totalAmount, newValue: newTotal })
      }
    }
    if (advanceAmount !== undefined || addPayment !== undefined) {
      if (advance !== existingBooking.advanceAmount) {
        changes.push({ field: 'advanceAmount', oldValue: existingBooking.advanceAmount, newValue: advance })
      }
    }
    if (eventDate && new Date(eventDate).getTime() !== new Date(existingBooking.eventDate).getTime()) {
      changes.push({ field: 'eventDate', oldValue: existingBooking.eventDate, newValue: new Date(eventDate) })
    }

    const booking = await (prisma as any).functionHallBooking.update({
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
        // Update advance amount (either from direct set or from addPayment)
        ...((advanceAmount !== undefined || addPayment !== undefined) && { advanceAmount: advance }),
        balanceAmount,
        ...(specialRequests !== undefined && { specialRequests }),
        ...(status && { status }),
        // Electricity fields
        ...(meterReadingBefore !== undefined && { meterReadingBefore: meterReadingBefore ? parseFloat(meterReadingBefore) : null }),
        ...(meterReadingAfter !== undefined && { meterReadingAfter: meterReadingAfter ? parseFloat(meterReadingAfter) : null }),
        ...(electricityUnitPrice !== undefined && { electricityUnitPrice: parseFloat(electricityUnitPrice) }),
        ...(unitsConsumed !== null && { unitsConsumed }),
        ...(electricityCharges !== null && { electricityCharges }),
        // Additional charges
        ...(maintenanceCharges !== undefined && { maintenanceCharges: parseFloat(maintenanceCharges) }),
        ...(otherCharges !== undefined && { otherCharges: parseFloat(otherCharges) }),
        ...(otherChargesNote !== undefined && { otherChargesNote }),
        grandTotal,
      },
      include: {
        hall: true,
        history: true,
      },
    })

    const action = status && status !== existingBooking.status ? 'STATUS_CHANGED' : 'UPDATED'
    const notes = status && status !== existingBooking.status
      ? `Status changed from ${existingBooking.status} to ${status}`
      : changes.length > 0
        ? `Booking updated. ${changes.map((c) => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ')}`
        : 'Booking updated.'
    if (changes.length > 0 || action === 'STATUS_CHANGED') {
      await logHallBookingChange(
        params.id,
        action,
        userId,
        changes.length > 0 ? changes : undefined,
        notes,
      )
    }

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
      await (prisma as any).functionHallBooking.delete({
        where: { id: params.id }
      })
      return Response.json(successResponse(null, 'Booking deleted permanently'))
    } else {
      // Soft delete (cancel)
      const existing = await (prisma as any).functionHallBooking.findUnique({
        where: { id: params.id },
        include: { hall: true },
      })
      const booking = await (prisma as any).functionHallBooking.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' }
      })
      const userId = (authResult as any).userId
      await logHallBookingChange(
        params.id,
        'CANCELLED',
        userId,
        [{ field: 'status', oldValue: existing?.status, newValue: 'CANCELLED' }],
        existing?.hall ? `Hall booking cancelled for ${existing.hall.name}.` : 'Booking cancelled.',
      )
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
