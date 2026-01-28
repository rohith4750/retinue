import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/bank-accounts - List all bank accounts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (!includeInactive) {
      where.isActive = true
    }

    const accounts = await (prisma as any).bankAccount.findMany({
      where,
      orderBy: { accountName: 'asc' },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    })

    // Calculate total balance across all active accounts
    const totalBalance = accounts
      .filter((acc: any) => acc.isActive)
      .reduce((sum: number, acc: any) => sum + acc.currentBalance, 0)

    return Response.json(successResponse({
      accounts,
      totalBalance
    }))
  } catch (error) {
    console.error('Error fetching bank accounts:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch bank accounts'),
      { status: 500 }
    )
  }
}

// POST /api/bank-accounts - Create new bank account
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const {
      accountName,
      bankName,
      accountNumber,
      accountType,
      currentBalance,
      notes
    } = data

    if (!accountName) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Account name is required'),
        { status: 400 }
      )
    }

    const account = await (prisma as any).bankAccount.create({
      data: {
        accountName,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        accountType: accountType || 'SAVINGS',
        currentBalance: parseFloat(currentBalance) || 0,
        notes: notes || null
      }
    })

    // If there's an initial balance, create an initial deposit transaction
    if (currentBalance && parseFloat(currentBalance) > 0) {
      await (prisma as any).bankTransaction.create({
        data: {
          accountId: account.id,
          type: 'DEPOSIT',
          amount: parseFloat(currentBalance),
          balanceAfter: parseFloat(currentBalance),
          description: 'Initial opening balance',
          category: 'Opening Balance'
        }
      })
    }

    return Response.json(successResponse(account, 'Bank account created successfully'))
  } catch (error: any) {
    console.error('Error creating bank account:', error)
    return Response.json(
      errorResponse('Server error', error.message || 'Failed to create bank account'),
      { status: 500 }
    )
  }
}
