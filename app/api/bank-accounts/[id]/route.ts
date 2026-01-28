import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/bank-accounts/[id] - Get single account with transactions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const account = await (prisma as any).bankAccount.findUnique({
      where: { id: params.id }
    })

    if (!account) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Bank account not found'),
        { status: 404 }
      )
    }

    // Get transactions with pagination
    const [transactions, totalTransactions] = await Promise.all([
      (prisma as any).bankTransaction.findMany({
        where: { accountId: params.id },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit
      }),
      (prisma as any).bankTransaction.count({
        where: { accountId: params.id }
      })
    ])

    return Response.json(successResponse({
      account,
      transactions,
      pagination: {
        page,
        limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit)
      }
    }))
  } catch (error) {
    console.error('Error fetching bank account:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch bank account'),
      { status: 500 }
    )
  }
}

// PUT /api/bank-accounts/[id] - Update account details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const {
      accountName,
      bankName,
      accountNumber,
      accountType,
      isActive,
      notes
    } = data

    const account = await (prisma as any).bankAccount.update({
      where: { id: params.id },
      data: {
        ...(accountName && { accountName }),
        ...(bankName !== undefined && { bankName }),
        ...(accountNumber !== undefined && { accountNumber }),
        ...(accountType && { accountType }),
        ...(isActive !== undefined && { isActive }),
        ...(notes !== undefined && { notes })
      }
    })

    return Response.json(successResponse(account, 'Bank account updated successfully'))
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('NOT_FOUND', 'Bank account not found'),
        { status: 404 }
      )
    }
    console.error('Error updating bank account:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to update bank account'),
      { status: 500 }
    )
  }
}

// DELETE /api/bank-accounts/[id] - Delete account (soft delete by deactivating)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      await (prisma as any).bankAccount.delete({
        where: { id: params.id }
      })
      return Response.json(successResponse(null, 'Bank account deleted permanently'))
    } else {
      // Soft delete - just deactivate
      const account = await (prisma as any).bankAccount.update({
        where: { id: params.id },
        data: { isActive: false }
      })
      return Response.json(successResponse(account, 'Bank account deactivated'))
    }
  } catch (error: any) {
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('NOT_FOUND', 'Bank account not found'),
        { status: 404 }
      )
    }
    console.error('Error deleting bank account:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to delete bank account'),
      { status: 500 }
    )
  }
}
