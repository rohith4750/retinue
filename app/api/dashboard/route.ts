import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";
import moment from "moment";
import { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request);
    if (authResult instanceof Response) return authResult;
    const user = authResult as any;
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    const { searchParams } = new URL(request.url);
    const filterDate = searchParams.get("date");
    const filterMonth = searchParams.get("month");

    // Reference point for "now" in Indian Standard Time (UTC+5:30)
    const nowInIST = moment().utcOffset("+05:30");
    
    let referenceDate = nowInIST.clone();
    if (filterDate) {
      referenceDate = moment(filterDate).utcOffset("+05:30", true).startOf('day');
    } else if (filterMonth) {
      referenceDate = moment(`${filterMonth}-01`).utcOffset("+05:30", true).startOf('month');
    }

    const today = referenceDate.clone().startOf('day').toDate();
    const tomorrow = referenceDate.clone().add(1, 'day').startOf('day').toDate();
    const startOfMonth = referenceDate.clone().startOf('month').toDate();
    const endOfMonth = referenceDate.clone().endOf('month').toDate();
    
    const startOfLastMonth = referenceDate.clone().subtract(1, 'month').startOf('month').toDate();
    const endOfLastMonth = referenceDate.clone().subtract(1, 'month').endOf('month').toDate();

    const now = filterDate ? referenceDate.clone().add(12, 'hours').toDate() : nowInIST.toDate();

    // Filter to exclude testing data
    const excludeTestingFilter = {
      guest: {
        name: {
          not: {
            contains: "testing",
          },
        },
      },
    };

    // Basic Hotel Stats
    const totalRooms = await prisma.room.count();
    const maintenanceRooms = await prisma.room.count({ where: { status: "MAINTENANCE" } });

    // Active bookings overlap calculation
    const activeBookings = await prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        ...excludeTestingFilter,
      },
      select: { roomId: true, checkIn: true, checkOut: true, status: true },
    });

    const overlappingToday = activeBookings.filter((b) => {
      const bCheckIn = new Date(b.checkIn);
      const bCheckOut = new Date(b.checkOut);
      const effectiveCheckOut = b.status === "CHECKED_IN" && bCheckOut < now ? now : bCheckOut;
      return bCheckIn < tomorrow && effectiveCheckOut > today;
    });

    const allRooms = await prisma.room.findMany({ select: { id: true, roomType: true, status: true } });
    const bookedRoomIds = new Set(overlappingToday.map((b) => b.roomId));
    
    const availableRoomsByType: Record<string, number> = {};
    let availableRooms = 0;
    
    allRooms.forEach(room => {
      const isBooked = bookedRoomIds.has(room.id);
      const isMaintenance = room.status === "MAINTENANCE";
      
      if (!isBooked && !isMaintenance) {
        availableRooms++;
        availableRoomsByType[room.roomType] = (availableRoomsByType[room.roomType] || 0) + 1;
      }
    });

    const bookedRooms = bookedRoomIds.size;

    // Summary counts
    const todayBookings = await prisma.booking.count({
      where: {
        checkIn: { gte: today, lt: tomorrow },
        status: { notIn: ["CHECKED_OUT", "CANCELLED"] },
        ...excludeTestingFilter,
      },
    });

    const monthBookings = await prisma.booking.count({
      where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
    });

    const lastMonthBookings = await prisma.booking.count({
      where: { checkIn: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
    });

    // Revenue Tracking
    const todayRevenueAggregate = await prisma.booking.aggregate({
      where: { checkIn: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
      _sum: { paidAmount: true },
    });
    const todayRevenue = todayRevenueAggregate._sum.paidAmount || 0;

    const monthRevenueAggregate = await prisma.booking.aggregate({
      where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
      _sum: { paidAmount: true },
    });
    const monthRevenue = monthRevenueAggregate._sum.paidAmount || 0;

    const lastMonthRevenueAggregate = await prisma.booking.aggregate({
      where: { checkIn: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
      _sum: { paidAmount: true },
    });
    const lastMonthRevenue = lastMonthRevenueAggregate._sum.paidAmount || 0;

    // Hall Stats & Revenue
    let totalHalls = 0;
    let hallRevenueThisMonth = 0;
    let hallTodayBookings = 0;
    let hallUpcoming7Days = 0;
    let hallBookingsThisMonth = 0;
    
    try {
      totalHalls = await prisma.functionHall.count();
      const hallFilters = { customerName: { not: { contains: "testing" } } };

      hallBookingsThisMonth = await prisma.functionHallBooking.count({
        where: { eventDate: { gte: startOfMonth, lte: endOfMonth }, status: { not: "CANCELLED" }, ...hallFilters },
      });

      const hRevData = await prisma.functionHallBooking.aggregate({
        where: { eventDate: { gte: startOfMonth, lte: endOfMonth }, status: { in: ["CONFIRMED", "COMPLETED"] }, ...hallFilters },
        _sum: { totalAmount: true },
      });
      hallRevenueThisMonth = hRevData._sum.totalAmount || 0;

      hallTodayBookings = await prisma.functionHallBooking.count({
        where: { eventDate: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" }, ...hallFilters },
      });

      const nextWeekForHalls = referenceDate.clone().add(7, 'days').toDate();
      hallUpcoming7Days = await prisma.functionHallBooking.count({
        where: { eventDate: { gte: today, lt: nextWeekForHalls }, status: { in: ["PENDING", "CONFIRMED"] }, ...hallFilters },
      });
    } catch (e) {}

    // Weekly Revenue Chart Data
    const weeklyRevenue: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = referenceDate.clone().subtract(i, 'days').startOf('day').toDate();
      const dNext = referenceDate.clone().subtract(i - 1, 'days').startOf('day').toDate();
      
      const dayRevenue = await prisma.booking.aggregate({
        where: { checkIn: { gte: d, lt: dNext }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
        _sum: { paidAmount: true },
      });
      
      weeklyRevenue.push({
        day: moment(d).format('ddd'),
        amount: dayRevenue._sum.paidAmount || 0,
      });
    }

    // Monthly Trend Data
    const monthlyTrend: { month: string; hotelRevenue: number; hallRevenue: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = referenceDate.clone().subtract(i, 'months').startOf('month').toDate();
      const mEnd = referenceDate.clone().subtract(i, 'months').endOf('month').toDate();
      
      const hRev = await prisma.booking.aggregate({
        where: { checkIn: { gte: mStart, lte: mEnd }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
        _sum: { paidAmount: true },
      });
      
      const hallRev = await prisma.functionHallBooking.aggregate({
        where: { eventDate: { gte: mStart, lte: mEnd }, status: { not: "CANCELLED" }, customerName: { not: { contains: "testing" } } },
        _sum: { totalAmount: true },
      });
      
      const hotelAmount = hRev._sum.paidAmount || 0;
      const hallAmount = hallRev._sum.totalAmount || 0;
      
      monthlyTrend.push({
        month: moment(mStart).format('MMM'),
        hotelRevenue: hotelAmount,
        hallRevenue: hallAmount,
        total: hotelAmount + hallAmount
      });
    }

    // Analytical Breakdowns
    const bookingsByStatus: any = {};
    const statuses: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "PENDING"];
    for (const status of statuses) {
      bookingsByStatus[status] = await prisma.booking.count({ where: { status, ...excludeTestingFilter } });
    }

    const bookingsByGuestType: any = {};
    const guestTypes = ['WALK_IN', 'CORPORATE', 'OTA', 'REGULAR', 'FAMILY', 'GOVERNMENT', 'AGENT'];
    for (const type of guestTypes) {
      bookingsByGuestType[type] = {
        count: await prisma.booking.count({ where: { guest: { guestType: type, name: { not: { contains: "testing" } } } } }),
        revenue: 0 
      };
    }

    const bookingsByGuestTypeThisMonth: any = {};
    for (const type of guestTypes) {
      const agg = await prisma.booking.aggregate({
        where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, guest: { guestType: type, name: { not: { contains: "testing" } } }, status: { not: "CANCELLED" } },
        _sum: { paidAmount: true },
        _count: true
      });
      bookingsByGuestTypeThisMonth[type] = {
        count: agg._count || 0,
        revenue: agg._sum?.paidAmount || 0
      };
    }

    const roomsByType: any = {};
    const roomTypes = await prisma.room.groupBy({ by: ['roomType'], _count: true });
    roomTypes.forEach(rt => roomsByType[rt.roomType] = rt._count);

    // Performance Metrics
    const completedBookingsThisMonth = await prisma.booking.findMany({
      where: { checkOut: { gte: startOfMonth, lte: endOfMonth }, status: "CHECKED_OUT", ...excludeTestingFilter },
      select: { checkIn: true, checkOut: true, paidAmount: true }
    });
    
    let totalStayHours = 0;
    completedBookingsThisMonth.forEach(b => {
      totalStayHours += moment(b.checkOut).diff(moment(b.checkIn), 'hours');
    });
    const avgStayHoursThisMonth = completedBookingsThisMonth.length > 0 ? Math.round(totalStayHours / completedBookingsThisMonth.length) : 0;
    const avgBookingValueThisMonth = monthBookings > 0 ? Math.round(monthRevenue / monthBookings) : 0;

    // Payment Health
    const paymentStatusThisMonth = {
      PAID: await prisma.booking.count({ where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, paymentStatus: "PAID", status: { not: "CANCELLED" }, ...excludeTestingFilter } }),
      PARTIAL: await prisma.booking.count({ where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, paymentStatus: "PARTIAL", status: { not: "CANCELLED" }, ...excludeTestingFilter } }),
      PENDING: await prisma.booking.count({ where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, paymentStatus: "PENDING", status: { not: "CANCELLED" }, ...excludeTestingFilter } }),
    };

    // Recent Activity
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: excludeTestingFilter,
      include: { guest: true, room: true }
    });

    const recentHallBookings = await prisma.functionHallBooking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { customerName: { not: { contains: "testing" } } },
      include: { hall: true }
    });

    // Top Performers
    const topRoomsRaw = await prisma.booking.groupBy({
      by: ['roomId'],
      where: { checkIn: { gte: startOfMonth, lte: endOfMonth }, status: { not: "CANCELLED" }, ...excludeTestingFilter },
      _sum: { paidAmount: true },
      orderBy: { _sum: { paidAmount: 'desc' } },
      take: 5
    });
    
    const topRoomsThisMonth = await Promise.all(topRoomsRaw.map(async (tr) => {
      const room = await prisma.room.findUnique({ where: { id: tr.roomId } });
      return { roomId: tr.roomId, roomNumber: room?.roomNumber, roomType: room?.roomType, floor: room?.floor, revenue: tr._sum.paidAmount || 0 };
    }));

    // Event Type Analysis for Halls
    const hallEventTypesThisMonth = await prisma.functionHallBooking.groupBy({
      by: ['eventType'],
      where: { eventDate: { gte: startOfMonth, lte: endOfMonth }, status: { not: "CANCELLED" }, customerName: { not: { contains: "testing" } } },
      _count: true
    }).then(res => res.map(r => ({ eventType: r.eventType, count: r._count })));

    // Inventory Alerts
    const inventory = await prisma.inventory.findMany({
      select: { quantity: true, minStock: true }
    });
    const lowStockAlerts = inventory.filter(item => item.quantity <= item.minStock).length;

    const stats = {
      totalRooms,
      availableRooms,
      availableRoomsByType,
      bookedRooms,
      occupancyRate: totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0,
      todayBookings,
      monthBookings,
      bookingGrowth: lastMonthBookings > 0 ? Math.round(((monthBookings - lastMonthBookings) / lastMonthBookings) * 100) : (monthBookings > 0 ? 100 : 0),
      todayRevenue: isAdmin ? todayRevenue : 0,
      monthRevenue: isAdmin ? monthRevenue : 0,
      hallRevenueThisMonth: isAdmin ? hallRevenueThisMonth : 0,
      totalMonthlyRevenue: isAdmin ? monthRevenue + hallRevenueThisMonth : 0,
      revenueGrowth: isAdmin && lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : (monthRevenue > 0 ? 100 : 0),
      pendingPayments: isAdmin ? (await prisma.booking.aggregate({ where: { paymentStatus: { in: ["PENDING", "PARTIAL"] }, status: { not: "CANCELLED" }, ...excludeTestingFilter }, _sum: { balanceAmount: true } }))._sum.balanceAmount || 0 : 0,
      totalStaff: await prisma.staff.count({ where: { status: "ACTIVE" } }),
      totalGuests: await prisma.guest.count({ where: { name: { not: { contains: "testing" } } } }),
      newGuestsThisMonth: await prisma.guest.count({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth }, name: { not: { contains: "testing" } } } }),
      totalHalls,
      hallTodayBookings,
      hallUpcoming7Days,
      hallBookingsThisMonth,
      overdueCheckouts: await prisma.booking.count({ where: { status: "CHECKED_IN", checkOut: { lt: now }, ...excludeTestingFilter } }),
      maintenanceRooms,
      weeklyRevenue,
      monthlyTrend,
      bookingsByStatus,
      bookingsByGuestType,
      bookingsByGuestTypeThisMonth,
      roomsByType,
      avgStayHoursThisMonth,
      avgBookingValueThisMonth,
      paymentStatusThisMonth,
      recentBookings,
      recentHallBookings,
      topRoomsThisMonth,
      lowStockAlerts,
      hallEventTypesThisMonth,
      upcomingCheckIns: todayBookings,
      upcomingCheckOuts: await prisma.booking.count({ where: { checkOut: { gte: today, lt: tomorrow }, status: "CHECKED_IN", ...excludeTestingFilter } }),
      timestamp: nowInIST.toISOString()
    };

    return Response.json(successResponse(stats));
  } catch (error) {
    console.error("Dashboard Error:", error);
    return Response.json(errorResponse("Server error", "Dashboard failed"), { status: 500 });
  }
}
