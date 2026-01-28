import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// POST /api/bank-accounts/[id]/transactions - Create new transaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const {
      type,
      amount,
      description,
      reference,
      category,
      relatedTo,
      transactionDate
    } = data

    if (!type || !amount || !description) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Type, amount, and description are required'),
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Amount must be a positive number'),
        { status: 400 }
      )
    }

    // Get current account balance
    const account = await (prisma as any).bankAccount.findUnique({
      where: { id: params.id }
    })

    if (!account) {
      return Response.json(
        errorResponse('NOT_FOUND', 'Bank account not found'),
        { status: 404 }
      )
    }

    if (!account.isActive) {
      return Response.json(
        errorResponse('ACCOUNT_INACTIVE', 'Cannot add transactions to inactive account'),
        { status: 400 }
      )
    }

    // Calculate new balance based on transaction type
    let newBalance = account.currentBalance
    if (type === 'DEPOSIT' || type === 'TRANSFER_IN') {
      newBalance += parsedAmount
    } else if (type === 'WITHDRAWAL' || type === 'TRANSFER_OUT') {
      if (parsedAmount > account.currentBalance) {
        return Response.json(
          errorResponse('INSUFFICIENT_BALANCE', `Insufficient balance. Available: ₹${account.currentBalance.toLocaleString()}`),
          { status: 400 }
        )
      }
      newBalance -= parsedAmount
    }

    // Create transaction and update account balance in a transaction
    const [transaction] = await (prisma as any).$transaction([
      (prisma as any).bankTransaction.create({
        data: {
          accountId: params.id,
          type,
          amount: parsedAmount,
          balanceAfter: newBalance,
          description,
          reference: reference || null,
          category: category || null,
          relatedTo: relatedTo || null,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          createdBy: null
        }
      }),
      (prisma as any).bankAccount.update({
        where: { id: params.id },
        data: { currentBalance: newBalance }
      })
    ])

    return Response.json(successResponse(transaction, 'Transaction recorded successfully'))
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    return Response.json(
      errorResponse('Server error', error.message || 'Failed to create transaction'),
      { status: 500 }
    )
  }
}

// GET /api/bank-accounts/[id]/transactions - Get all transactions for account
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const skip = (page - 1) * limit

    const where: any = { accountId: params.id }
    if (type) where.type = type
    if (category) where.category = category

    const [transactions, total] = await Promise.all([
      (prisma as any).bankTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit
      }),
      (prisma as any).bankTransaction.count({ where })
    ])

    return Response.json(successResponse({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }))
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch transactions'),
      { status: 500 }
    )
  }
}
