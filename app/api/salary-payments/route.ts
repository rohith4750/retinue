import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - List salary payments with filters
export async function GET(request: NextRequest) {
  try {
    // Allow ADMIN and above to view salary payments
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const staffId = searchParams.get('staffId')

    const where: any = {}

    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)
    if (staffId) where.staffId = staffId

    const payments = await prisma.salaryPayment.findMany({
      where,
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            role: true,
            salary: true,
            businessUnit: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { paymentDate: 'desc' }],
    })

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + p.netAmount, 0)
    const hotelPayments = payments.filter(p => p.staff.businessUnit === 'HOTEL')
    const conventionPayments = payments.filter(p => p.staff.businessUnit === 'CONVENTION')
    const hotelTotal = hotelPayments.reduce((sum, p) => sum + p.netAmount, 0)
    const conventionTotal = conventionPayments.reduce((sum, p) => sum + p.netAmount, 0)

    return NextResponse.json({
      success: true,
      data: payments,
      summary: {
        total: totalPaid,
        hotel: hotelTotal,
        convention: conventionTotal,
        count: payments.length,
      },
    })
  } catch (error) {
    console.error('Get salary payments error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch salary payments' },
      { status: 500 }
    )
  }
}

// POST - Create salary payment
export async function POST(request: NextRequest) {
  try {
    // Allow ADMIN and above to create salary payments
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const {
      staffId,
      month,
      year,
      amount,
      bonus = 0,
      deductions = 0,
      paymentDate,
      paymentMethod,
      notes,
    } = body

    // Validation
    if (!staffId || !month || !year || !amount || !paymentDate) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    })

    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Check if payment already exists for this month
    const existingPayment = await prisma.salaryPayment.findUnique({
      where: {
        staffId_month_year: {
          staffId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    })

    if (existingPayment) {
      return NextResponse.json(
        { success: false, message: `Salary already paid for ${staff.name} for this month` },
        { status: 400 }
      )
    }

    const netAmount = parseFloat(amount) + parseFloat(bonus || 0) - parseFloat(deductions || 0)

    const payment = await (prisma as any).salaryPayment.create({
      data: {
        staffId,
        month: parseInt(month),
        year: parseInt(year),
        amount: parseFloat(amount),
        bonus: parseFloat(bonus || 0),
        deductions: parseFloat(deductions || 0),
        netAmount,
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        createdBy: authResult.id,
      },
      include: {
        staff: {
          select: {
            name: true,
            role: true,
            businessUnit: true,
          },
        },
      },
    })

    // Note: Salary payments are automatically shown in expenses view
    // No need to create duplicate expense record

    return NextResponse.json({
      success: true,
      message: 'Salary payment recorded successfully',
      data: payment,
    })
  } catch (error) {
    console.error('Create salary payment error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create salary payment' },
      { status: 500 }
    )
  }
}
