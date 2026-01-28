import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

// GET /api/bills/[id] - Get bill details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
      include: {
        booking: {
          include: {
            room: true,
            slot: true,
            guest: true,
          },
        },
      },
    })

    if (!bill) {
      return Response.json(
        errorResponse('Not found', 'Bill not found'),
        { status: 404 }
      )
    }

    return Response.json(successResponse(bill))
  } catch (error) {
    console.error('Error fetching bill:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch bill'),
      { status: 500 }
    )
  }
}

// PUT /api/bills/[id] - Update payment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { paidAmount } = data

    if (paidAmount === undefined) {
      return Response.json(
        errorResponse('Validation error', 'Paid amount is required'),
        { status: 400 }
      )
    }

    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
    })

    if (!bill) {
      return Response.json(
        errorResponse('Not found', 'Bill not found'),
        { status: 404 }
      )
    }

    const newPaidAmount = bill.paidAmount + parseFloat(paidAmount)
    const balanceAmount = bill.totalAmount - newPaidAmount
    const paymentStatus =
      balanceAmount <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'PENDING'

    const updatedBill = await prisma.bill.update({
      where: { id: params.id },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount,
        paymentStatus,
      },
      include: {
        booking: {
          include: {
            room: true,
            slot: true,
            guest: true,
          },
        },
      },
    })

    return Response.json(successResponse(updatedBill, 'Payment updated successfully'))
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
