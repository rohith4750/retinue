import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - Get revenue and expense summary
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month')
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    const currentYear = parseInt(year)
    const currentMonth = month ? parseInt(month) : null

    // Get hotel revenue (from Bills with paid amounts)
    const hotelRevenueQuery: any = {
      booking: {
        status: { in: ['CHECKED_OUT', 'CONFIRMED', 'CHECKED_IN'] },
      },
      paymentStatus: { in: ['PAID', 'PARTIAL'] },
    }

    if (currentMonth) {
      hotelRevenueQuery.createdAt = {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      }
    } else {
      hotelRevenueQuery.createdAt = {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1),
      }
    }

    const hotelBills = await (prisma.bill as any).findMany({
      where: hotelRevenueQuery,
      select: {
        paidAmount: true,
        totalAmount: true,
        createdAt: true,
      },
    })

    const hotelRevenue = hotelBills.reduce((sum: number, bill: any) => sum + bill.paidAmount, 0)

    // Get convention revenue (from FunctionHallBooking with paid amounts)
    const conventionRevenueQuery: any = {
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    }

    if (currentMonth) {
      conventionRevenueQuery.eventDate = {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      }
    } else {
      conventionRevenueQuery.eventDate = {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1),
      }
    }

    const conventionBookings = await (prisma.functionHallBooking as any).findMany({
      where: conventionRevenueQuery,
      select: {
        totalAmount: true,
        advanceAmount: true,
        eventDate: true,
      },
    })

    const conventionRevenue = conventionBookings.reduce((sum: number, booking: any) => sum + booking.advanceAmount, 0)
    const conventionPendingRevenue = conventionBookings.reduce((sum: number, booking: any) => sum + (booking.totalAmount - booking.advanceAmount), 0)

    // Get expenses
    const expenseQuery: any = {
      year: currentYear,
    }

    if (currentMonth) {
      expenseQuery.month = currentMonth
    }

    const expenses = await (prisma.expense as any).findMany({
      where: expenseQuery,
    })

    // Calculate expense totals by business unit
    const hotelExpenses = expenses
      .filter((exp: any) => exp.businessUnit === 'HOTEL')
      .reduce((sum: number, exp: any) => sum + exp.amount, 0)

    const conventionExpenses = expenses
      .filter((exp: any) => exp.businessUnit === 'CONVENTION')
      .reduce((sum: number, exp: any) => sum + exp.amount, 0)

    const sharedExpenses = expenses
      .filter((exp: any) => exp.businessUnit === 'BOTH')
      .reduce((sum: number, exp: any) => sum + exp.amount, 0)

    const totalExpenses = hotelExpenses + conventionExpenses + sharedExpenses

    // Calculate expense breakdown by category
    const expenseByCategory = expenses.reduce((acc: Record<string, number>, exp: any) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0
      }
      acc[exp.category] += exp.amount
      return acc
    }, {} as Record<string, number>)

    // Monthly breakdown for the year
    const monthlyData = []
    const monthsToFetch = currentMonth ? [currentMonth] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    for (const m of monthsToFetch) {
      const monthStart = new Date(currentYear, m - 1, 1)
      const monthEnd = new Date(currentYear, m, 1)

      // Monthly hotel revenue
      const monthlyHotelBills = hotelBills.filter((bill: any) => {
        const billDate = new Date(bill.createdAt)
        return billDate >= monthStart && billDate < monthEnd
      })
      const monthlyHotelRevenue = monthlyHotelBills.reduce((sum: number, bill: any) => sum + bill.paidAmount, 0)

      // Monthly convention revenue
      const monthlyConventionBookings = conventionBookings.filter((booking: any) => {
        const eventDate = new Date(booking.eventDate)
        return eventDate >= monthStart && eventDate < monthEnd
      })
      const monthlyConventionRevenue = monthlyConventionBookings.reduce((sum: number, booking: any) => sum + booking.advanceAmount, 0)

      // Monthly expenses
      const monthlyExpenses = expenses.filter((exp: any) => exp.month === m)
      const monthlyHotelExpenses = monthlyExpenses
        .filter((exp: any) => exp.businessUnit === 'HOTEL' || exp.businessUnit === 'BOTH')
        .reduce((sum: number, exp: any) => sum + (exp.businessUnit === 'BOTH' ? exp.amount / 2 : exp.amount), 0)
      const monthlyConventionExpenses = monthlyExpenses
        .filter((exp: any) => exp.businessUnit === 'CONVENTION' || exp.businessUnit === 'BOTH')
        .reduce((sum: number, exp: any) => sum + (exp.businessUnit === 'BOTH' ? exp.amount / 2 : exp.amount), 0)

      monthlyData.push({
        month: m,
        monthName: new Date(currentYear, m - 1).toLocaleString('default', { month: 'short' }),
        hotel: {
          revenue: monthlyHotelRevenue,
          expenses: monthlyHotelExpenses,
          profit: monthlyHotelRevenue - monthlyHotelExpenses,
        },
        convention: {
          revenue: monthlyConventionRevenue,
          expenses: monthlyConventionExpenses,
          profit: monthlyConventionRevenue - monthlyConventionExpenses,
        },
        total: {
          revenue: monthlyHotelRevenue + monthlyConventionRevenue,
          expenses: monthlyHotelExpenses + monthlyConventionExpenses,
          profit: (monthlyHotelRevenue + monthlyConventionRevenue) - (monthlyHotelExpenses + monthlyConventionExpenses),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          year: currentYear,
          month: currentMonth,
        },
        revenue: {
          hotel: hotelRevenue,
          convention: conventionRevenue,
          conventionPending: conventionPendingRevenue,
          total: hotelRevenue + conventionRevenue,
        },
        expenses: {
          hotel: hotelExpenses + (sharedExpenses / 2),
          convention: conventionExpenses + (sharedExpenses / 2),
          shared: sharedExpenses,
          total: totalExpenses,
          byCategory: expenseByCategory,
        },
        profit: {
          hotel: hotelRevenue - (hotelExpenses + sharedExpenses / 2),
          convention: conventionRevenue - (conventionExpenses + sharedExpenses / 2),
          total: (hotelRevenue + conventionRevenue) - totalExpenses,
        },
        monthly: monthlyData,
      },
    })
  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch summary' },
      { status: 500 }
    )
  }
}
