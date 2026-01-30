import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const now = new Date()
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

    // Maintenance rooms (excluded from available/booked counts)
    const maintenanceRooms = await prisma.room.count({
      where: { status: 'MAINTENANCE' },
    })

    // Booked/available TODAY: same logic as GET /api/rooms/available
    // Check-out day = available: occupancy ends at start of check-out day
    const overlappingToday = await prisma.booking.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkIn: { lt: tomorrow } },
          { checkOut: { gt: today } },
        ],
      },
      select: { roomId: true, checkOut: true },
    })
    const bookedRoomIdsToday = overlappingToday.filter((b) => {
      const checkoutDayStart = new Date(b.checkOut)
      checkoutDayStart.setHours(0, 0, 0, 0)
      return checkoutDayStart > today
    })
    const bookedRooms = new Set(bookedRoomIdsToday.map((b) => b.roomId)).size
    const availableRooms = Math.max(0, totalRooms - maintenanceRooms - bookedRooms)

    // Today's check-ins that are still active (exclude checked-out / cancelled)
    const todayBookings = await prisma.booking.count({
      where: {
        checkIn: {
          gte: today,
          lt: tomorrow,
        },
        status: { notIn: ['CHECKED_OUT', 'CANCELLED'] },
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

    // Today's revenue (using Booking - Bill merged)
    const todayRevenue = await prisma.booking.aggregate({
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
    const monthRevenue = await prisma.booking.aggregate({
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
    const lastMonthRevenue = await prisma.booking.aggregate({
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
    const pendingPayments = await prisma.booking.aggregate({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      _sum: {
        balanceAmount: true,
      },
    })

    // Low inventory alerts (quantity <= minStock; Prisma can't compare two columns in where)
    const allInventory = await prisma.inventory.findMany()
    const lowStockItems = allInventory.filter((item) => item.quantity <= item.minStock)

    // Booking status breakdown
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    })

    // Customer / Guest type analytics (from bookings via guest)
    const bookingsWithGuest = await prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        totalAmount: true,
        paidAmount: true,
        createdAt: true,
        guest: { select: { guestType: true } },
      },
    })
    const guestTypeAllTime: Record<string, { count: number; revenue: number }> = {}
    const guestTypeThisMonth: Record<string, { count: number; revenue: number }> = {}
    const guestTypeLabels: Record<string, string> = {
      WALK_IN: 'Walk-in',
      CORPORATE: 'Corporate',
      OTA: 'OTA',
      GOVERNMENT: 'Government',
      REGULAR: 'Regular',
      AGENT: 'Agent',
      FAMILY: 'Family',
    }
    for (const b of bookingsWithGuest) {
      const type = b.guest?.guestType || 'WALK_IN'
      if (!guestTypeAllTime[type]) guestTypeAllTime[type] = { count: 0, revenue: 0 }
      guestTypeAllTime[type].count += 1
      guestTypeAllTime[type].revenue += b.totalAmount || 0
      if (b.createdAt >= startOfMonth) {
        if (!guestTypeThisMonth[type]) guestTypeThisMonth[type] = { count: 0, revenue: 0 }
        guestTypeThisMonth[type].count += 1
        guestTypeThisMonth[type].revenue += b.totalAmount || 0
      }
    }

    // Bookings by room type (all time + this month)
    const bookingsWithRoom = await prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        totalAmount: true,
        createdAt: true,
        room: { select: { roomType: true } },
      },
    })
    const roomTypeAllTime: Record<string, { count: number; revenue: number }> = {}
    const roomTypeThisMonth: Record<string, { count: number; revenue: number }> = {}
    const roomTypeLabels: Record<string, string> = {
      SINGLE: 'Single',
      DOUBLE: 'Double',
      DELUXE: 'Deluxe',
      STANDARD: 'Standard',
      SUITE: 'Suite',
      SUITE_PLUS: 'Suite+',
    }
    for (const b of bookingsWithRoom) {
      const type = b.room?.roomType || 'STANDARD'
      if (!roomTypeAllTime[type]) roomTypeAllTime[type] = { count: 0, revenue: 0 }
      roomTypeAllTime[type].count += 1
      roomTypeAllTime[type].revenue += b.totalAmount || 0
      if (b.createdAt >= startOfMonth) {
        if (!roomTypeThisMonth[type]) roomTypeThisMonth[type] = { count: 0, revenue: 0 }
        roomTypeThisMonth[type].count += 1
        roomTypeThisMonth[type].revenue += b.totalAmount || 0
      }
    }

    // Room type distribution (room count)
    const roomsByType = await prisma.room.groupBy({
      by: ['roomType'],
      _count: true,
    })

    // Function halls stats - use raw queries to avoid TypeScript issues
    let totalHalls = 0
    let hallBookingsThisMonth = 0
    let hallRevenueThisMonth = 0
    let recentHallBookings: any[] = []
    let hallTodayBookings = 0
    let hallUpcoming7Days = 0
    let hallStatusThisMonth: Record<string, number> = {}
    let hallEventTypesThisMonth: Array<{ eventType: string; count: number }> = []
    let topHallsThisMonth: Array<{ hallId: string; name: string; revenue: number; bookings: number }> = []

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

      // Today events (by eventDate)
      // @ts-ignore
      hallTodayBookings = await prisma.functionHallBooking.count({
        where: {
          eventDate: { gte: today, lt: tomorrow },
          status: { notIn: ['CANCELLED'] },
        },
      })

      // Upcoming events (next 7 days)
      const nextWeekForHalls = new Date(today)
      nextWeekForHalls.setDate(nextWeekForHalls.getDate() + 7)
      // @ts-ignore
      hallUpcoming7Days = await prisma.functionHallBooking.count({
        where: {
          eventDate: { gte: today, lt: nextWeekForHalls },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })

      // Status breakdown (this month)
      // @ts-ignore
      const hallStatusRows = await prisma.functionHallBooking.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startOfMonth } },
        _count: true,
      })
      hallStatusThisMonth = hallStatusRows.reduce((acc: any, r: any) => {
        acc[r.status] = r._count
        return acc
      }, {})

      // Event types breakdown (this month) - no orderBy/take in groupBy; sort/slice in JS
      const hallEventTypeRows = (await (prisma as any).functionHallBooking.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: startOfMonth }, status: { notIn: ['CANCELLED'] } },
        _count: true,
      })) as any[]
      hallEventTypesThisMonth = hallEventTypeRows
        .map((r: any) => ({ eventType: r.eventType, count: r._count }))
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 6)

      // Top halls by booked value this month - sort/slice in JS (groupBy orderBy requires by-fields)
      // @ts-ignore
      const topHallGroupsRaw = await prisma.functionHallBooking.groupBy({
        by: ['hallId'],
        where: { createdAt: { gte: startOfMonth }, status: { notIn: ['CANCELLED'] } },
        _count: true,
        _sum: { totalAmount: true },
      })
      const topHallGroups = topHallGroupsRaw
        .sort((a: any, b: any) => (b._sum?.totalAmount ?? 0) - (a._sum?.totalAmount ?? 0))
        .slice(0, 5)
      const topHallIds = topHallGroups.map((g: any) => g.hallId)
      // @ts-ignore
      const topHallMeta = await prisma.functionHall.findMany({
        where: { id: { in: topHallIds } },
        select: { id: true, name: true },
      })
      topHallsThisMonth = topHallGroups.map((g: any) => {
        const meta = topHallMeta.find((h: any) => h.id === g.hallId)
        return {
          hallId: g.hallId,
          name: meta?.name || '—',
          revenue: g._sum?.totalAmount || 0,
          bookings: g._count || 0,
        }
      })

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

      const dayRevenue = await prisma.booking.aggregate({
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

      const monthData = await prisma.booking.aggregate({
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

    // Recent bookings (billing info now in Booking itself)
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { bookingDate: 'desc' },
      include: {
        room: true,
        guest: true,
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

    // Payment health (this month)
    const paymentStatusThisMonth = await prisma.booking.groupBy({
      by: ['paymentStatus'],
      where: {
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' },
      },
      _count: true,
    })

    // Operational alerts
    const overdueCheckouts = await prisma.booking.count({
      where: {
        status: 'CHECKED_IN',
        checkOut: { lt: now },
      },
    })
    // @ts-ignore - Prisma types may be outdated (flexibleCheckout)
    const flexibleCheckoutActive = await (prisma.booking as any).count({
      where: { status: 'CHECKED_IN', flexibleCheckout: true },
    })
    // maintenanceRooms already computed at top (used for available/booked today)

    // Stay metrics (this month)
    const monthStayRows = await prisma.booking.findMany({
      where: {
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' },
      },
      select: { checkIn: true, checkOut: true, totalAmount: true, paidAmount: true },
      take: 3000,
    })
    let stayHoursSum = 0
    let stayCount = 0
    for (const b of monthStayRows) {
      const diffMs = new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()
      if (Number.isFinite(diffMs) && diffMs > 0) {
        stayHoursSum += diffMs / (1000 * 60 * 60)
        stayCount += 1
      }
    }
    const avgStayHoursThisMonth = stayCount > 0 ? Math.round((stayHoursSum / stayCount) * 10) / 10 : 0
    const avgBookingValueThisMonth =
      monthBookings > 0 ? Math.round(((monthRevenue._sum.paidAmount || 0) / monthBookings) * 100) / 100 : 0

    // Top rooms this month by paid revenue - sort/slice in JS (groupBy orderBy requires by-fields)
    const topRoomGroupsRaw = await prisma.booking.groupBy({
      by: ['roomId'],
      where: {
        createdAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' },
      },
      _sum: { paidAmount: true },
    })
    const topRoomGroups = topRoomGroupsRaw
      .sort((a, b) => (b._sum?.paidAmount ?? 0) - (a._sum?.paidAmount ?? 0))
      .slice(0, 5)
    const topRoomIds = topRoomGroups.map((g) => g.roomId)
    const topRoomsMeta = topRoomIds.length
      ? await prisma.room.findMany({
          where: { id: { in: topRoomIds } },
          select: { id: true, roomNumber: true, roomType: true, floor: true },
        })
      : []
    const topRoomsThisMonth = topRoomGroups.map((g) => {
      const meta = topRoomsMeta.find((r) => r.id === g.roomId)
      return {
        roomId: g.roomId,
        roomNumber: meta?.roomNumber || '—',
        roomType: meta?.roomType || '—',
        floor: meta?.floor ?? null,
        revenue: g._sum.paidAmount || 0,
      }
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
      hallTodayBookings,
      hallUpcoming7Days,
      hallStatusThisMonth,
      hallEventTypesThisMonth,
      topHallsThisMonth,
      
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
      bookingsByGuestType: guestTypeAllTime,
      bookingsByGuestTypeThisMonth: guestTypeThisMonth,
      guestTypeLabels,
      bookingsByRoomType: roomTypeAllTime,
      bookingsByRoomTypeThisMonth: roomTypeThisMonth,
      roomTypeLabels,
      
      // Trends
      weeklyRevenue,
      monthlyTrend,
      
      // Recent activities
      recentBookings,
      recentHallBookings,

      // More analytics
      paymentStatusThisMonth: paymentStatusThisMonth.reduce((acc: any, item) => {
        acc[item.paymentStatus] = item._count
        return acc
      }, {}),
      avgStayHoursThisMonth,
      avgBookingValueThisMonth,
      overdueCheckouts,
      flexibleCheckoutActive,
      maintenanceRooms,
      topRoomsThisMonth,
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
