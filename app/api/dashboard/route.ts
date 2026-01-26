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

    // Total rooms
    const totalRooms = await prisma.room.count()

    // Available rooms today
    const availableRooms = await prisma.room.count({
      where: { status: 'AVAILABLE' },
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

    const stats = {
      totalRooms,
      availableRooms,
      todayBookings,
      todayRevenue: todayRevenue._sum.paidAmount || 0,
      pendingPayments: pendingPayments._sum.balanceAmount || 0,
      lowStockAlerts: lowStockItems.length,
      recentBookings,
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
