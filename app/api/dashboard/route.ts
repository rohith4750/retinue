import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get start of current month and last month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    // Total rooms
    const totalRooms = await prisma.room.count()

    // Available rooms today
    const availableRooms = await prisma.room.count({
      where: { status: 'AVAILABLE' },
    })

    // Booked rooms
    const bookedRooms = await prisma.room.count({
      where: { status: 'BOOKED' },
    })

    // Today's bookings
    const todayBookings = await prisma.booking.count({
      where: {
        checkIn: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // This month's bookings
    const monthBookings = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // Last month's bookings for comparison
    const lastMonthBookings = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    })

    // Today's revenue
    const todayRevenue = await prisma.bill.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        paidAmount: true,
      },
    })

    // This month's revenue
    const monthRevenue = await prisma.bill.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        paidAmount: true,
        totalAmount: true,
      },
    })

    // Last month's revenue for comparison
    const lastMonthRevenue = await prisma.bill.aggregate({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      _sum: {
        paidAmount: true,
      },
    })

    // Pending payments
    const pendingPayments = await prisma.bill.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      _sum: {
        balanceAmount: true,
      },
    })

    // Low inventory alerts
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        quantity: {
          lte: prisma.inventory.fields.minStock,
        },
      },
    })

    // Booking status breakdown
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    })

    // Room type distribution
    const roomsByType = await prisma.room.groupBy({
      by: ['roomType'],
      _count: true,
    })

    // Function halls stats - use raw queries to avoid TypeScript issues
    let totalHalls = 0
    let hallBookingsThisMonth = 0
    let hallRevenueThisMonth = 0
    let recentHallBookings: any[] = []

    try {
      // @ts-ignore - Prisma types may not be updated
      totalHalls = await prisma.functionHall.count()
      // @ts-ignore
      hallBookingsThisMonth = await prisma.functionHallBooking.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      })
      // @ts-ignore
      const hallRevenueData = await prisma.functionHallBooking.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        _sum: {
          advanceAmount: true,
        },
      })
      hallRevenueThisMonth = hallRevenueData._sum.advanceAmount || 0

      // @ts-ignore - Prisma types may not include FunctionHallBooking relations
      recentHallBookings = await (prisma.functionHallBooking as any).findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          hall: true,
        },
      })
    } catch (e) {
      // Function hall tables might not exist yet
    }

    // Staff count
    const totalStaff = await prisma.staff.count({
      where: { status: 'ACTIVE' },
    })

    // Guests count
    const totalGuests = await prisma.guest.count()
    const newGuestsThisMonth = await prisma.guest.count({
      where: {
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // Weekly revenue data (last 7 days)
    const weeklyRevenue = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayRevenue = await prisma.bill.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
        _sum: {
          paidAmount: true,
        },
      })

      weeklyRevenue.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        amount: dayRevenue._sum.paidAmount || 0,
      })
    }

    // Monthly revenue trend (last 6 months)
    const monthlyTrend = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0)

      const monthData = await prisma.bill.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          paidAmount: true,
        },
      })

      // Also get hall revenue
      let hallMonthRevenue = 0
      try {
        // @ts-ignore
        const hallMonthData = await prisma.functionHallBooking.aggregate({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: {
            advanceAmount: true,
          },
        })
        hallMonthRevenue = hallMonthData._sum.advanceAmount || 0
      } catch (e) {
        // Function hall tables might not exist
      }

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        year: monthStart.getFullYear(),
        hotelRevenue: monthData._sum.paidAmount || 0,
        hallRevenue: hallMonthRevenue,
        total: (monthData._sum.paidAmount || 0) + hallMonthRevenue,
      })
    }

    // Recent bookings
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { bookingDate: 'desc' },
      include: {
        room: true,
        guest: true,
        bill: true,
      },
    })

    // Upcoming check-ins (next 7 days)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingCheckIns = await prisma.booking.count({
      where: {
        checkIn: {
          gte: today,
          lt: nextWeek,
        },
        status: 'CONFIRMED',
      },
    })

    // Upcoming check-outs (today)
    const upcomingCheckOuts = await prisma.booking.count({
      where: {
        checkOut: {
          gte: today,
          lt: tomorrow,
        },
        status: 'CHECKED_IN',
      },
    })

    // Calculate occupancy rate
    const occupancyRate = totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0

    // Calculate growth percentages
    const bookingGrowth = lastMonthBookings > 0 
      ? Math.round(((monthBookings - lastMonthBookings) / lastMonthBookings) * 100)
      : monthBookings > 0 ? 100 : 0

    const revenueGrowth = (lastMonthRevenue._sum.paidAmount || 0) > 0
      ? Math.round((((monthRevenue._sum.paidAmount || 0) - (lastMonthRevenue._sum.paidAmount || 0)) / (lastMonthRevenue._sum.paidAmount || 1)) * 100)
      : (monthRevenue._sum.paidAmount || 0) > 0 ? 100 : 0

    const stats = {
      // Basic stats
      totalRooms,
      availableRooms,
      bookedRooms,
      occupancyRate,
      
      // Booking stats
      todayBookings,
      monthBookings,
      bookingGrowth,
      upcomingCheckIns,
      upcomingCheckOuts,
      
      // Revenue stats
      todayRevenue: todayRevenue._sum.paidAmount || 0,
      monthRevenue: monthRevenue._sum.paidAmount || 0,
      revenueGrowth,
      pendingPayments: pendingPayments._sum.balanceAmount || 0,
      
      // Function Hall stats
      totalHalls,
      hallBookingsThisMonth,
      hallRevenueThisMonth,
      
      // Other stats
      lowStockAlerts: lowStockItems.length,
      totalStaff,
      totalGuests,
      newGuestsThisMonth,
      
      // Breakdowns
      bookingsByStatus: bookingsByStatus.reduce((acc: any, item) => {
        acc[item.status] = item._count
        return acc
      }, {}),
      roomsByType: roomsByType.reduce((acc: any, item) => {
        acc[item.roomType] = item._count
        return acc
      }, {}),
      
      // Trends
      weeklyRevenue,
      monthlyTrend,
      
      // Recent activities
      recentBookings,
      recentHallBookings,
    }

    return Response.json(successResponse(stats))
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch dashboard data'),
      { status: 500 }
    )
  }
}
