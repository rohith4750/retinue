import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// Neon free tier limit
const NEON_FREE_LIMIT_MB = 512
const NEON_FREE_LIMIT_BYTES = NEON_FREE_LIMIT_MB * 1024 * 1024

// GET /api/admin/db-analytics - Get database analytics (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can access this
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    // Get all table counts in parallel (Bill merged into Booking)
    const [
      roomCount,
      roomSlotCount,
      guestCount,
      bookingCount,
      inventoryCount,
      assetLocationCount,
      inventoryTransactionCount,
      staffCount,
      salaryPaymentCount,
      attendanceCount,
      userCount,
      bookingHistoryCount,
      passwordResetCount,
      functionHallCount,
      functionHallBookingCount,
      expenseCount,
      utilityBillCount,
      bankAccountCount,
      bankTransactionCount,
    ] = await Promise.all([
      prisma.room.count(),
      prisma.roomSlot.count(),
      prisma.guest.count(),
      prisma.booking.count(),
      prisma.inventory.count(),
      prisma.assetLocation.count(),
      prisma.inventoryTransaction.count(),
      prisma.staff.count(),
      prisma.salaryPayment.count(),
      prisma.attendance.count(),
      prisma.user.count(),
      prisma.bookingHistory.count(),
      prisma.passwordReset.count(),
      prisma.functionHall.count(),
      prisma.functionHallBooking.count(),
      prisma.expense.count(),
      prisma.utilityBill.count(),
      prisma.bankAccount.count(),
      prisma.bankTransaction.count(),
    ])

    // Get database size using raw SQL (PostgreSQL specific)
    let databaseSize = null
    let databaseSizeBytes = 0
    let tablesSizes: any[] = []

    try {
      // Get total database size in bytes
      const dbSizeBytesResult = await prisma.$queryRaw<{ size_bytes: bigint }[]>`
        SELECT pg_database_size(current_database()) as size_bytes
      `
      databaseSizeBytes = Number(dbSizeBytesResult[0]?.size_bytes || 0)

      // Get total database size pretty
      const dbSizeResult = await prisma.$queryRaw<{ size: string }[]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `
      databaseSize = dbSizeResult[0]?.size || 'Unknown'

      // Get individual table sizes
      const tableSizesResult = await prisma.$queryRaw<{ table_name: string; total_size: string; data_size: string; index_size: string; row_count: bigint; size_bytes: bigint }[]>`
        SELECT 
          relname as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_size_pretty(pg_relation_size(relid)) as data_size,
          pg_size_pretty(pg_indexes_size(relid)) as index_size,
          n_live_tup as row_count,
          pg_total_relation_size(relid) as size_bytes
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
      `

      tablesSizes = tableSizesResult.map(row => ({
        tableName: row.table_name,
        totalSize: row.total_size,
        dataSize: row.data_size,
        indexSize: row.index_size,
        rowCount: Number(row.row_count),
        sizeBytes: Number(row.size_bytes),
      }))
    } catch (err) {
      console.error('Error getting database sizes:', err)
      // Continue without size data
    }

    // Calculate storage analysis
    const usedMB = databaseSizeBytes / (1024 * 1024)
    const remainingMB = NEON_FREE_LIMIT_MB - usedMB
    const usagePercent = (usedMB / NEON_FREE_LIMIT_MB) * 100

    // Get archivable data counts (data that can be safely removed)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

    const [
      expiredPasswordResets,
      oldBookingHistory,
      oldInventoryTransactions,
      completedBookingsOld,
      oldAttendance,
    ] = await Promise.all([
      prisma.passwordReset.count({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true },
          ],
        },
      }),
      prisma.bookingHistory.count({
        where: { timestamp: { lt: sixMonthsAgo } },
      }),
      prisma.inventoryTransaction.count({
        where: { createdAt: { lt: oneYearAgo } },
      }),
      prisma.booking.count({
        where: {
          status: 'CHECKED_OUT',
          checkOut: { lt: oneYearAgo },
        },
      }),
      prisma.attendance.count({
        where: { date: { lt: oneYearAgo } },
      }),
    ])

    // Table statistics (Bill merged into Booking - now 19 tables)
    const tables = [
      { name: 'Room', model: 'Room', count: roomCount, description: 'Hotel rooms' },
      { name: 'RoomSlot', model: 'RoomSlot', count: roomSlotCount, description: 'Room availability slots' },
      { name: 'Guest', model: 'Guest', count: guestCount, description: 'Guest records' },
      { name: 'Booking', model: 'Booking', count: bookingCount, description: 'Room bookings (includes billing)' },
      { name: 'Inventory', model: 'Inventory', count: inventoryCount, description: 'Inventory items' },
      { name: 'AssetLocation', model: 'AssetLocation', count: assetLocationCount, description: 'Asset locations' },
      { name: 'InventoryTransaction', model: 'InventoryTransaction', count: inventoryTransactionCount, description: 'Stock movements' },
      { name: 'Staff', model: 'Staff', count: staffCount, description: 'Staff members' },
      { name: 'SalaryPayment', model: 'SalaryPayment', count: salaryPaymentCount, description: 'Salary payments' },
      { name: 'Attendance', model: 'Attendance', count: attendanceCount, description: 'Staff attendance' },
      { name: 'User', model: 'User', count: userCount, description: 'System users' },
      { name: 'BookingHistory', model: 'BookingHistory', count: bookingHistoryCount, description: 'Booking audit trail' },
      { name: 'PasswordReset', model: 'PasswordReset', count: passwordResetCount, description: 'Password reset tokens' },
      { name: 'FunctionHall', model: 'FunctionHall', count: functionHallCount, description: 'Convention halls' },
      { name: 'FunctionHallBooking', model: 'FunctionHallBooking', count: functionHallBookingCount, description: 'Hall bookings' },
      { name: 'Expense', model: 'Expense', count: expenseCount, description: 'Expense records' },
      { name: 'UtilityBill', model: 'UtilityBill', count: utilityBillCount, description: 'Utility bills' },
      { name: 'BankAccount', model: 'BankAccount', count: bankAccountCount, description: 'Bank accounts' },
      { name: 'BankTransaction', model: 'BankTransaction', count: bankTransactionCount, description: 'Bank transactions' },
    ]

    // Merge with size data if available
    const tablesWithSizes = tables.map(table => {
      const sizeData = tablesSizes.find(s => s.tableName.toLowerCase() === table.model.toLowerCase())
      return {
        ...table,
        totalSize: sizeData?.totalSize || '-',
        dataSize: sizeData?.dataSize || '-',
        indexSize: sizeData?.indexSize || '-',
      }
    })

    // Calculate totals
    const totalRecords = tables.reduce((sum, t) => sum + t.count, 0)

    // Get some quick stats
    const [
      activeBookings,
      pendingBills,
      lowStockItems,
      recentTransactions,
    ] = await Promise.all([
      prisma.booking.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } }),
      prisma.booking.count({ where: { paymentStatus: { in: ['PENDING', 'PARTIAL'] } } }),
      prisma.inventory.count({ where: { quantity: { lte: prisma.inventory.fields.minStock } } }),
      prisma.bankTransaction.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ])

    return Response.json(
      successResponse({
        database: {
          totalSize: databaseSize,
          totalSizeBytes: databaseSizeBytes,
          totalTables: tables.length,
          totalRecords,
        },
        storage: {
          limitMB: NEON_FREE_LIMIT_MB,
          usedMB: Math.round(usedMB * 100) / 100,
          remainingMB: Math.round(remainingMB * 100) / 100,
          usagePercent: Math.round(usagePercent * 100) / 100,
          status: usagePercent > 90 ? 'CRITICAL' : usagePercent > 70 ? 'WARNING' : 'HEALTHY',
        },
        archivable: {
          expiredPasswordResets,
          oldBookingHistory,
          oldInventoryTransactions,
          completedBookingsOld,
          oldAttendance,
          totalArchivable: expiredPasswordResets + oldBookingHistory + oldInventoryTransactions + oldAttendance,
        },
        tables: tablesWithSizes,
        quickStats: {
          activeBookings,
          pendingBills,
          lowStockItems,
          recentTransactions,
        },
        timestamp: new Date().toISOString(),
      })
    )
  } catch (error) {
    console.error('Error fetching database analytics:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch database analytics'),
      { status: 500 }
    )
  }
}

// POST /api/admin/db-analytics - Verify password OR perform actions
export async function POST(request: NextRequest) {
  try {
    // Only SUPER_ADMIN can access this
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { action, password } = body

    // Password verification
    if (action === 'verify' || !action) {
      const correctPassword = process.env.DB_ANALYTICS_PASSWORD || 'SuperAdmin@DB2026'
      if (password !== correctPassword) {
        return Response.json(
          errorResponse('INVALID_PASSWORD', 'Incorrect password'),
          { status: 401 }
        )
      }
      return Response.json(successResponse({ verified: true }))
    }

    // Export data action
    if (action === 'export') {
      const { table, filter } = body
      let data: any[] = []
      let filename = ''

      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

      switch (table) {
        case 'bookingHistory':
          data = await prisma.bookingHistory.findMany({
            where: filter === 'old' ? { timestamp: { lt: sixMonthsAgo } } : {},
            orderBy: { timestamp: 'desc' },
          })
          filename = `booking_history_${new Date().toISOString().split('T')[0]}.json`
          break

        case 'inventoryTransactions':
          data = await prisma.inventoryTransaction.findMany({
            where: filter === 'old' ? { createdAt: { lt: oneYearAgo } } : {},
            include: { inventory: { select: { itemName: true, category: true } } },
            orderBy: { createdAt: 'desc' },
          })
          filename = `inventory_transactions_${new Date().toISOString().split('T')[0]}.json`
          break

        case 'attendance':
          data = await prisma.attendance.findMany({
            where: filter === 'old' ? { date: { lt: oneYearAgo } } : {},
            include: { staff: { select: { name: true, role: true } } },
            orderBy: { date: 'desc' },
          })
          filename = `attendance_${new Date().toISOString().split('T')[0]}.json`
          break

        case 'bookings':
          data = await prisma.booking.findMany({
            where: filter === 'old' ? { status: 'CHECKED_OUT', checkOut: { lt: oneYearAgo } } : {},
            include: {
              guest: { select: { name: true, phone: true } },
              room: { select: { roomNumber: true, roomType: true } },
            },
            orderBy: { checkOut: 'desc' },
          })
          filename = `bookings_${new Date().toISOString().split('T')[0]}.json`
          break

        case 'passwordResets':
          data = await prisma.passwordReset.findMany({
            where: {
              OR: [
                { expiresAt: { lt: new Date() } },
                { used: true },
              ],
            },
            orderBy: { createdAt: 'desc' },
          })
          filename = `password_resets_${new Date().toISOString().split('T')[0]}.json`
          break

        default:
          return Response.json(
            errorResponse('INVALID_TABLE', 'Invalid table specified'),
            { status: 400 }
          )
      }

      return Response.json(successResponse({ data, filename, count: data.length }))
    }

    // Cleanup action
    if (action === 'cleanup') {
      const { table } = body
      let deletedCount = 0

      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

      switch (table) {
        case 'passwordResets':
          const result1 = await prisma.passwordReset.deleteMany({
            where: {
              OR: [
                { expiresAt: { lt: new Date() } },
                { used: true },
              ],
            },
          })
          deletedCount = result1.count
          break

        case 'bookingHistory':
          const result2 = await prisma.bookingHistory.deleteMany({
            where: { timestamp: { lt: sixMonthsAgo } },
          })
          deletedCount = result2.count
          break

        case 'inventoryTransactions':
          const result3 = await prisma.inventoryTransaction.deleteMany({
            where: { createdAt: { lt: oneYearAgo } },
          })
          deletedCount = result3.count
          break

        case 'attendance':
          const result4 = await prisma.attendance.deleteMany({
            where: { date: { lt: oneYearAgo } },
          })
          deletedCount = result4.count
          break

        default:
          return Response.json(
            errorResponse('INVALID_TABLE', 'Invalid table specified'),
            { status: 400 }
          )
      }

      return Response.json(successResponse({ deleted: deletedCount, table }))
    }

    // Factory Reset - Delete ALL data EXCEPT users
    if (action === 'factoryReset') {
      const { confirmPassword } = body
      
      // Require password confirmation for this dangerous action
      const correctPassword = process.env.DB_ANALYTICS_PASSWORD || 'SuperAdmin@DB2026'
      if (confirmPassword !== correctPassword) {
        return Response.json(
          errorResponse('INVALID_PASSWORD', 'Password confirmation failed'),
          { status: 401 }
        )
      }

      // Delete all data in correct order (respecting foreign key constraints)
      // Use a transaction to ensure all-or-nothing
      const result = await prisma.$transaction(async (tx) => {
        const counts: Record<string, number> = {}

        // 1. Delete booking-related data first (depends on bookings)
        counts.bookingHistory = (await tx.bookingHistory.deleteMany()).count

        // 2. Delete bookings (depends on rooms, guests, roomSlots)
        counts.bookings = (await tx.booking.deleteMany()).count

        // 3. Delete room slots (KEEP slots to preserve calendar structure)
        // counts.roomSlots = (await tx.roomSlot.deleteMany()).count
        counts.roomSlots = 0

        // 4. Delete guests
        counts.guests = (await tx.guest.deleteMany()).count

        // 5. Delete rooms (KEEP rooms as per user request)
        // counts.rooms = (await tx.room.deleteMany()).count
        counts.rooms = 0

        // 6. Delete function hall bookings (depends on function halls)
        counts.functionHallBookings = (await tx.functionHallBooking.deleteMany()).count

        // 7. Delete function halls (KEEP halls as part of structure)
        // counts.functionHalls = (await tx.functionHall.deleteMany()).count
        counts.functionHalls = 0

        // 8. Delete inventory transactions (depends on inventory)
        counts.inventoryTransactions = (await tx.inventoryTransaction.deleteMany()).count

        // 9. Delete inventory (KEEP inventory catalog)
        // counts.inventory = (await tx.inventory.deleteMany()).count
        counts.inventory = 0

        // 10. Delete asset locations (KEEP asset setup)
        // counts.assetLocations = (await tx.assetLocation.deleteMany()).count
        counts.assetLocations = 0

        // 11. Delete salary payments (depends on staff)
        counts.salaryPayments = (await tx.salaryPayment.deleteMany()).count

        // 12. Delete attendance (depends on staff)
        counts.attendance = (await tx.attendance.deleteMany()).count

        // 13. Delete staff (KEEP staff records)
        // counts.staff = (await tx.staff.deleteMany()).count
        counts.staff = 0

        // 14. Delete expenses
        counts.expenses = (await tx.expense.deleteMany()).count

        // 15. Delete utility bills
        counts.utilityBills = (await tx.utilityBill.deleteMany()).count

        // 16. Delete bank transactions (depends on bank accounts)
        counts.bankTransactions = (await tx.bankTransaction.deleteMany()).count

        // 17. Delete bank accounts (KEEP bank accounts)
        // counts.bankAccounts = (await tx.bankAccount.deleteMany()).count
        counts.bankAccounts = 0

        // 18. Delete password resets (depends on users - but we keep users)
        counts.passwordResets = (await tx.passwordReset.deleteMany()).count

        return counts
      })

      // Calculate total deleted
      const totalDeleted = Object.values(result).reduce((sum, count) => sum + count, 0)

      return Response.json(successResponse({ 
        success: true,
        message: 'Factory reset completed. Transactional data deleted. Master data (Rooms, Users, Staff, Inventory) preserved.',
        deletedCounts: result,
        totalDeleted,
      }))
    }

    return Response.json(
      errorResponse('INVALID_ACTION', 'Invalid action specified'),
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in db-analytics POST:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to process request'),
      { status: 500 }
    )
  }
}
