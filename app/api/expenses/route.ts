import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - List all expenses with filters (includes salary payments)
export async function GET(request: NextRequest) {
  try {
    // Allow all authenticated users to fetch expenses
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const searchParams = request.nextUrl.searchParams
    const businessUnit = searchParams.get('businessUnit')
    const category = searchParams.get('category')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: any = {}
    const salaryWhere: any = {}

    if (businessUnit) {
      where.businessUnit = businessUnit
    }

    if (category) {
      where.category = category
    }

    if (month && year) {
      where.month = parseInt(month)
      where.year = parseInt(year)
      salaryWhere.month = parseInt(month)
      salaryWhere.year = parseInt(year)
    } else if (year) {
      where.year = parseInt(year)
      salaryWhere.year = parseInt(year)
    }

    // Fetch regular expenses
    const expenses = await (prisma as any).expense.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    // Fetch salary payments with staff details (only if not filtering by non-SALARY category)
    let salaryPayments: any[] = []
    if (!category || category === 'SALARY') {
      salaryPayments = await (prisma as any).salaryPayment.findMany({
        where: salaryWhere,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              role: true,
              staffType: true,
              businessUnit: true,
            }
          }
        },
        orderBy: { paymentDate: 'desc' },
      })

      // Also filter by businessUnit if specified
      if (businessUnit) {
        salaryPayments = salaryPayments.filter((sp: any) => sp.staff?.businessUnit === businessUnit)
      }
    }

    // Convert salary payments to expense-like format
    const salaryExpenses = salaryPayments.map((sp: any) => ({
      id: `salary-${sp.id}`,
      businessUnit: sp.staff?.businessUnit || 'HOTEL',
      category: 'SALARY',
      description: `Salary - ${sp.staff?.name || 'Unknown'} (${sp.staff?.role || ''})`,
      amount: sp.netAmount,
      date: sp.paymentDate,
      month: sp.month,
      year: sp.year,
      vendor: sp.staff?.name,
      invoiceNumber: null,
      notes: sp.notes,
      createdAt: sp.createdAt,
      isSalaryPayment: true,
      staffId: sp.staffId,
      staffName: sp.staff?.name,
      staffRole: sp.staff?.role,
      staffType: sp.staff?.staffType,
      bonus: sp.bonus,
      deductions: sp.deductions,
      baseAmount: sp.amount,
    }))

    // Combine and sort by date
    const allExpenses = [...expenses, ...salaryExpenses].sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Calculate totals
    const totalExpenses = allExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0)
    const hotelExpenses = allExpenses
      .filter((exp: any) => exp.businessUnit === 'HOTEL' || exp.businessUnit === 'BOTH')
      .reduce((sum: number, exp: any) => sum + (exp.businessUnit === 'BOTH' ? exp.amount / 2 : exp.amount), 0)
    const conventionExpenses = allExpenses
      .filter((exp: any) => exp.businessUnit === 'CONVENTION' || exp.businessUnit === 'BOTH')
      .reduce((sum: number, exp: any) => sum + (exp.businessUnit === 'BOTH' ? exp.amount / 2 : exp.amount), 0)

    return NextResponse.json({
      success: true,
      data: allExpenses,
      summary: {
        total: totalExpenses,
        hotel: hotelExpenses,
        convention: conventionExpenses,
        count: allExpenses.length,
        salaryCount: salaryExpenses.length,
        expenseCount: expenses.length,
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

// POST - Create new expense (RECEPTIONIST can also add expenses)
export async function POST(request: NextRequest) {
  try {
    // Allow all authenticated users to create expenses
    const authResult = await requireAuth('RECEPTIONIST')(request)
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

    const expense = await (prisma as any).expense.create({
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
