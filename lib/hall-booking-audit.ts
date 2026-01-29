/**
 * Function Hall Booking audit trail (same pattern as hotel BookingHistory)
 */

import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

export interface HallBookingChange {
  field: string
  oldValue: any
  newValue: any
}

type TxClient = Prisma.TransactionClient

export async function logHallBookingChange(
  bookingId: string,
  action: string,
  userId?: string,
  changes?: HallBookingChange[],
  notes?: string,
  tx?: TxClient
) {
  const client = tx ?? prisma
  try {
    await (client as any).functionHallBookingHistory.create({
      data: {
        bookingId,
        action,
        changedBy: userId || null,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
        notes: notes || null,
      },
    })
  } catch (error) {
    console.error('Failed to log hall booking change:', error)
  }
}

export async function getHallBookingHistory(bookingId: string) {
  return await (prisma as any).functionHallBookingHistory.findMany({
    where: { bookingId },
    orderBy: { timestamp: 'desc' },
  })
}
