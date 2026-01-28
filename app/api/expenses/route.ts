import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - List all expenses with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const searchParams = request.nextUrl.searchParams
    const businessUnit = searchParams.get('businessUnit')
    const category = searchParams.get('category')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: any = {}

    if (businessUnit) {
      where.businessUnit = businessUnit
    }

    if (category) {
      where.category = category
    }

    if (month && year) {
      where.month = parseInt(month)
      where.year = parseInt(year)
    } else if (year) {
      where.year = parseInt(year)
    }

    const expenses = await (prisma.expense as any).findMany({
      where,
      orderBy: { date: 'desc' },
    })

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const hotelExpenses = expenses
      .filter(exp => exp.businessUnit === 'HOTEL' || exp.businessUnit === 'BOTH')
      .reduce((sum, exp) => sum + (exp.businessUnit === 'BOTH' ? exp.amount / 2 : exp.amount), 0)
    const conventionExpenses = expenses
      .filter(exp => exp.businessUnit === 'CONVENTION' || exp.businessUnit === 'BOTH')
      .reduce((sum, exp) => sum + (exp.businessUnit === 'BOTH' ? exp.amount / 2 : exp.amount), 0)

    return NextResponse.json({
      success: true,
      data: expenses,
      summary: {
        total: totalExpenses,
        hotel: hotelExpenses,
        convention: conventionExpenses,
        count: expenses.length,
      },
    })
  } catch (error) {
    console.error('Get expenses error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const {
      businessUnit,
      category,
      description,
      amount,
      date,
      vendor,
      invoiceNumber,
      notes,
    } = body

    // Validation
    if (!businessUnit || !category || !description || !amount || !date) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: businessUnit, category, description, amount, date' },
        { status: 400 }
      )
    }

    const expenseDate = new Date(date)
    const month = expenseDate.getMonth() + 1 // 1-12
    const year = expenseDate.getFullYear()

    const expense = await (prisma.expense as any).create({
      data: {
        businessUnit,
        category,
        description,
        amount: parseFloat(amount),
        date: expenseDate,
        month,
        year,
        vendor: vendor || null,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
        createdBy: authResult.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Expense created successfully',
      data: expense,
    })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create expense' },
      { status: 500 }
    )
  }
}
