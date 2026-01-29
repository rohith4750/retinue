/**
 * Booking audit trail utilities
 * Phase 3: Track all booking changes
 */

import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

export interface BookingChange {
  field: string
  oldValue: any
  newValue: any
}

/** Use transaction client when inside $transaction so history insert sees the new booking (avoids FK violation) */
type TxClient = Prisma.TransactionClient

/**
 * Log booking change to history.
 * When called inside a transaction, pass the transaction client (tx) so the history
 * row is created in the same transaction and sees the booking row (avoids FK violation).
 */
export async function logBookingChange(
  bookingId: string,
  action: string,
  userId?: string,
  changes?: BookingChange[],
  notes?: string,
  tx?: TxClient
) {
  const client = tx ?? prisma
  try {
    await client.bookingHistory.create({
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
