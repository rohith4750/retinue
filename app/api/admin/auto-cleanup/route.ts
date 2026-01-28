import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { sendDatabaseBackupEmail } from '@/lib/email'

// This endpoint can be triggered by:
// 1. Vercel Cron Jobs (if hosted on Vercel)
// 2. External cron services (cron-job.org, EasyCron, etc.)
// 3. Manual trigger from admin panel

// Retention periods (in days)
const RETENTION_PERIODS = {
  passwordResets: 7,        // 7 days for expired tokens
  bookingHistory: 60,       // 2 months for audit logs
  inventoryTransactions: 180, // 6 months for inventory transactions
  attendance: 90,           // 3 months for attendance
  completedBookings: 365,   // 1 year for completed bookings (export only)
}

// Secret key for cron authentication
const CRON_SECRET = process.env.CRON_SECRET || 'auto-cleanup-secret-2026'

export async function GET(request: NextRequest) {
  try {
    // Verify authorization (for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.nextUrl.searchParams.get('secret')
    
    // Allow if: Bearer token matches OR query param secret matches
    const isAuthorized = 
      authHeader === `Bearer ${CRON_SECRET}` || 
      cronSecret === CRON_SECRET

    if (!isAuthorized) {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Invalid authorization'),
        { status: 401 }
      )
    }

    const now = new Date()
    const results: any = {
      timestamp: now.toISOString(),
      exports: [],
      cleanups: [],
      errors: [],
      backupEmailSent: false,
    }

    // Calculate date thresholds
    const passwordResetThreshold = new Date(now.getTime() - RETENTION_PERIODS.passwordResets * 24 * 60 * 60 * 1000)
    const bookingHistoryThreshold = new Date(now.getTime() - RETENTION_PERIODS.bookingHistory * 24 * 60 * 60 * 1000)
    const inventoryThreshold = new Date(now.getTime() - RETENTION_PERIODS.inventoryTransactions * 24 * 60 * 60 * 1000)
    const attendanceThreshold = new Date(now.getTime() - RETENTION_PERIODS.attendance * 24 * 60 * 60 * 1000)

    // Backup data storage (will be sent via email)
    const backupData: {
      bookingHistory: any[]
      inventoryTransactions: any[]
      attendance: any[]
      passwordResets: any[]
    } = {
      bookingHistory: [],
      inventoryTransactions: [],
      attendance: [],
      passwordResets: [],
    }

    // 1. Fetch Password Resets to backup
    try {
      const expiredResets = await prisma.passwordReset.findMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { used: true },
            { createdAt: { lt: passwordResetThreshold } },
          ],
        },
        select: {
          id: true,
          email: true,
          used: true,
          expiresAt: true,
          createdAt: true,
        },
      })
      backupData.passwordResets = expiredResets
    } catch (err: any) {
      results.errors.push({ table: 'PasswordReset', error: err.message, phase: 'fetch' })
    }

    // 2. Fetch Booking History to backup
    try {
      const oldHistory = await prisma.bookingHistory.findMany({
        where: { timestamp: { lt: bookingHistoryThreshold } },
        orderBy: { timestamp: 'desc' },
      })
      backupData.bookingHistory = oldHistory
    } catch (err: any) {
      results.errors.push({ table: 'BookingHistory', error: err.message, phase: 'fetch' })
    }

    // 3. Fetch Inventory Transactions to backup
    try {
      const oldTransactions = await prisma.inventoryTransaction.findMany({
        where: { createdAt: { lt: inventoryThreshold } },
        include: { inventory: { select: { itemName: true, category: true } } },
        orderBy: { createdAt: 'desc' },
      })
      // Flatten the data for CSV
      backupData.inventoryTransactions = oldTransactions.map(t => ({
        id: t.id,
        inventoryId: t.inventoryId,
        itemName: t.inventory?.itemName || '',
        category: t.inventory?.category || '',
        type: t.type,
        quantity: t.quantity,
        reason: t.reason,
        performedBy: t.performedBy,
        createdAt: t.createdAt,
      }))
    } catch (err: any) {
      results.errors.push({ table: 'InventoryTransaction', error: err.message, phase: 'fetch' })
    }

    // 4. Fetch Attendance to backup
    try {
      const oldAttendance = await prisma.attendance.findMany({
        where: { date: { lt: attendanceThreshold } },
        include: { staff: { select: { name: true, role: true } } },
        orderBy: { date: 'desc' },
      })
      // Flatten the data for CSV
      backupData.attendance = oldAttendance.map(a => ({
        id: a.id,
        staffId: a.staffId,
        staffName: a.staff?.name || '',
        staffRole: a.staff?.role || '',
        date: a.date,
        status: a.status,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        notes: a.notes,
      }))
    } catch (err: any) {
      results.errors.push({ table: 'Attendance', error: err.message, phase: 'fetch' })
    }

    // Calculate total records to backup
    const totalToBackup = 
      backupData.passwordResets.length +
      backupData.bookingHistory.length +
      backupData.inventoryTransactions.length +
      backupData.attendance.length

    // Send backup email BEFORE deleting (only if there's data to backup)
    if (totalToBackup > 0) {
      const cleanedTables: string[] = []
      if (backupData.passwordResets.length > 0) cleanedTables.push(`Password Resets (${backupData.passwordResets.length})`)
      if (backupData.bookingHistory.length > 0) cleanedTables.push(`Booking History (${backupData.bookingHistory.length})`)
      if (backupData.inventoryTransactions.length > 0) cleanedTables.push(`Inventory Transactions (${backupData.inventoryTransactions.length})`)
      if (backupData.attendance.length > 0) cleanedTables.push(`Attendance (${backupData.attendance.length})`)

      try {
        const emailSent = await sendDatabaseBackupEmail(backupData, {
          totalRecords: totalToBackup,
          cleanedTables,
          timestamp: results.timestamp,
        })
        results.backupEmailSent = emailSent
        if (emailSent) {
          console.log('[Auto-Cleanup] Backup email sent successfully')
        } else {
          console.warn('[Auto-Cleanup] Backup email not sent (email not configured or failed)')
        }
      } catch (emailError: any) {
        console.error('[Auto-Cleanup] Failed to send backup email:', emailError.message)
        results.errors.push({ table: 'Email', error: emailError.message, phase: 'backup' })
      }
    }

    // Now DELETE the data (after backup is saved/sent)
    
    // Delete Password Resets
    if (backupData.passwordResets.length > 0) {
      try {
        const deleteResult = await prisma.passwordReset.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: now } },
              { used: true },
              { createdAt: { lt: passwordResetThreshold } },
            ],
          },
        })
        results.cleanups.push({
          table: 'PasswordReset',
          deleted: deleteResult.count,
          threshold: `${RETENTION_PERIODS.passwordResets} days`,
        })
        results.exports.push({
          table: 'PasswordReset',
          count: backupData.passwordResets.length,
        })
      } catch (err: any) {
        results.errors.push({ table: 'PasswordReset', error: err.message, phase: 'delete' })
      }
    }

    // Delete Booking History
    if (backupData.bookingHistory.length > 0) {
      try {
        const deleteResult = await prisma.bookingHistory.deleteMany({
          where: { timestamp: { lt: bookingHistoryThreshold } },
        })
        results.cleanups.push({
          table: 'BookingHistory',
          deleted: deleteResult.count,
          threshold: `${RETENTION_PERIODS.bookingHistory} days`,
        })
        results.exports.push({
          table: 'BookingHistory',
          count: backupData.bookingHistory.length,
        })
      } catch (err: any) {
        results.errors.push({ table: 'BookingHistory', error: err.message, phase: 'delete' })
      }
    }

    // Delete Inventory Transactions
    if (backupData.inventoryTransactions.length > 0) {
      try {
        const deleteResult = await prisma.inventoryTransaction.deleteMany({
          where: { createdAt: { lt: inventoryThreshold } },
        })
        results.cleanups.push({
          table: 'InventoryTransaction',
          deleted: deleteResult.count,
          threshold: `${RETENTION_PERIODS.inventoryTransactions} days`,
        })
        results.exports.push({
          table: 'InventoryTransaction',
          count: backupData.inventoryTransactions.length,
        })
      } catch (err: any) {
        results.errors.push({ table: 'InventoryTransaction', error: err.message, phase: 'delete' })
      }
    }

    // Delete Attendance
    if (backupData.attendance.length > 0) {
      try {
        const deleteResult = await prisma.attendance.deleteMany({
          where: { date: { lt: attendanceThreshold } },
        })
        results.cleanups.push({
          table: 'Attendance',
          deleted: deleteResult.count,
          threshold: `${RETENTION_PERIODS.attendance} days`,
        })
        results.exports.push({
          table: 'Attendance',
          count: backupData.attendance.length,
        })
      } catch (err: any) {
        results.errors.push({ table: 'Attendance', error: err.message, phase: 'delete' })
      }
    }

    // Calculate totals
    const totalExported = results.exports.reduce((sum: number, e: any) => sum + e.count, 0)
    const totalDeleted = results.cleanups.reduce((sum: number, c: any) => sum + c.deleted, 0)

    // Log the cleanup run
    console.log('[Auto-Cleanup]', JSON.stringify({
      timestamp: results.timestamp,
      totalExported,
      totalDeleted,
      backupEmailSent: results.backupEmailSent,
      errors: results.errors.length,
    }))

    return Response.json(successResponse({
      success: true,
      message: `Auto-cleanup completed. Backed up ${totalExported} records, deleted ${totalDeleted} records.${results.backupEmailSent ? ' Backup email sent.' : ''}`,
      ...results,
      totals: { exported: totalExported, deleted: totalDeleted },
      retentionPeriods: RETENTION_PERIODS,
    }))

  } catch (error: any) {
    console.error('[Auto-Cleanup Error]', error)
    return Response.json(
      errorResponse('CLEANUP_FAILED', error.message || 'Auto-cleanup failed'),
      { status: 500 }
    )
  }
}

// POST endpoint for manual trigger with authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret } = body

    if (secret !== CRON_SECRET) {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Invalid secret'),
        { status: 401 }
      )
    }

    // Redirect to GET handler logic
    const url = new URL(request.url)
    url.searchParams.set('secret', secret)
    
    const getRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers,
    })

    return GET(getRequest)

  } catch (error: any) {
    return Response.json(
      errorResponse('SERVER_ERROR', error.message),
      { status: 500 }
    )
  }
}
