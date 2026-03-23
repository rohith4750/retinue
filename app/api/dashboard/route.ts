import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

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

    let referenceDate = new Date();
    if (filterDate) {
      referenceDate = new Date(filterDate);
    } else if (filterMonth) {
      referenceDate = new Date(`${filterMonth}-01`);
    }

    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const now = filterDate ? new Date(today.getTime() + 12 * 60 * 60 * 1000) : new Date();

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

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

    const bookedRooms = new Set(overlappingToday.map((b) => b.roomId)).size;
    const availableRooms = Math.max(0, totalRooms - maintenanceRooms - bookedRooms);

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

    // Revenue tracking (attributed by check-in date)
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

    // Hall stats
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

      const nextWeekForHalls = new Date(today);
      nextWeekForHalls.setDate(nextWeekForHalls.getDate() + 7);
      hallUpcoming7Days = await prisma.functionHallBooking.count({
        where: { eventDate: { gte: today, lt: nextWeekForHalls }, status: { in: ["PENDING", "CONFIRMED"] }, ...hallFilters },
      });
    } catch (e) {}

    // Multi-factor calculations
    const totalMonthlyRevenue = monthRevenue + hallRevenueThisMonth;

    // Analytics breakdowns
    const bookingsByStatus = await prisma.booking.groupBy({
      by: ["status"],
      where: excludeTestingFilter,
      _count: true,
    });

    const roomsByType = await prisma.room.groupBy({
      by: ["roomType"],
      _count: true,
    });

    const stats = {
      totalRooms,
      availableRooms,
      bookedRooms,
      occupancyRate: totalRooms > 0 ? Math.round((bookedRooms / totalRooms) * 100) : 0,
      todayBookings,
      monthBookings,
      bookingGrowth: lastMonthBookings > 0 ? Math.round(((monthBookings - lastMonthBookings) / lastMonthBookings) * 100) : (monthBookings > 0 ? 100 : 0),
      todayRevenue: isAdmin ? todayRevenue : 0,
      monthRevenue: isAdmin ? monthRevenue : 0,
      hallRevenueThisMonth: isAdmin ? hallRevenueThisMonth : 0,
      totalMonthlyRevenue: isAdmin ? totalMonthlyRevenue : 0,
      revenueGrowth: isAdmin && lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : (monthRevenue > 0 ? 100 : 0),
      pendingPayments: isAdmin ? (await prisma.booking.aggregate({ where: { paymentStatus: { in: ["PENDING", "PARTIAL"] }, status: { not: "CANCELLED" }, ...excludeTestingFilter }, _sum: { balanceAmount: true } }))._sum.balanceAmount || 0 : 0,
      totalStaff: await prisma.staff.count({ where: { status: "ACTIVE" } }),
      totalGuests: await prisma.guest.count({ where: { name: { not: { contains: "testing" } } } }),
      newGuestsThisMonth: await prisma.guest.count({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth }, name: { not: { contains: "testing" } } } }),
      lowStockAlerts: (await prisma.inventory.findMany()).filter(item => item.quantity <= item.minStock).length,
      bookingsByStatus: bookingsByStatus.reduce((acc: any, item) => { acc[item.status] = item._count; return acc; }, {}),
      roomsByType: roomsByType.reduce((acc: any, item) => { acc[item.roomType] = item._count; return acc; }, {}),
      roomTypeLabels: { SINGLE: "Single", DOUBLE: "Double", DELUXE: "Deluxe", STANDARD: "Standard", SUITE: "Suite", SUITE_PLUS: "Suite+" },
      totalHalls,
      hallTodayBookings,
      hallUpcoming7Days,
      hallBookingsThisMonth,
      overdueCheckouts: await prisma.booking.count({ where: { status: "CHECKED_IN", checkOut: { lt: now }, ...excludeTestingFilter } }),
      maintenanceRooms,
    };

    return Response.json(successResponse(stats));
  } catch (error) {
     console.error("Dashboard Error:", error);
     return Response.json(errorResponse("Server error", "Dashboard failed"), { status: 500 });
  }
}
