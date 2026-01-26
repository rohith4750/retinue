/**
 * Booking audit trail utilities
 * Phase 3: Track all booking changes
 */

import { prisma } from './prisma'

export interface BookingChange {
  field: string
  oldValue: any
  newValue: any
}

/**
 * Log booking change to history
 */
export async function logBookingChange(
  bookingId: string,
  action: string,
  userId?: string,
  changes?: BookingChange[],
  notes?: string
) {
  try {
    await prisma.bookingHistory.create({
      data: {
        bookingId,
        action,
        changedBy: userId || null,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        notes: notes || null,
      },
    })
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log booking change:', error)
  }
}

/**
 * Get booking history
 */
export async function getBookingHistory(bookingId: string) {
  return await prisma.bookingHistory.findMany({
    where: { bookingId },
    orderBy: { timestamp: 'desc' },
  })
}
