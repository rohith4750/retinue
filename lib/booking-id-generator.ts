/**
 * Custom booking ID generator
 * Generates IDs in format: RETINU0123 (prefix + sequential number)
 */

import { prisma } from './prisma'

const BOOKING_ID_PREFIX = 'RETINU'
const ID_LENGTH = 4 // Number of digits after prefix

/**
 * Generate next booking ID
 * Format: RETINU0123, RETINU0124, etc.
 * @param tx - Optional transaction client (for use inside transactions)
 */
export async function generateBookingId(tx?: any): Promise<string> {
  const client = tx || prisma

  // Get all bookings with the RETINU prefix to find the highest number
  const bookingsWithPrefix = await client.booking.findMany({
    where: {
      id: {
        startsWith: BOOKING_ID_PREFIX,
      },
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  })

  let nextNumber = 1

  if (bookingsWithPrefix.length > 0) {
    // Extract numbers from all matching booking IDs and find the maximum
    const numbers: number[] = bookingsWithPrefix
      .map((booking: { id: string }) => {
        const numberPart = booking.id.replace(BOOKING_ID_PREFIX, '')
        return parseInt(numberPart, 10)
      })
      .filter((num: number) => !isNaN(num))

    if (numbers.length > 0) {
      const maxNumber = Math.max(...numbers)
      nextNumber = maxNumber + 1
    }
  }

  // Format number with leading zeros
  const paddedNumber = nextNumber.toString().padStart(ID_LENGTH, '0')
  
  const newId = `${BOOKING_ID_PREFIX}${paddedNumber}`

  // Double-check uniqueness (in case of race condition)
  const existing = await client.booking.findUnique({
    where: { id: newId },
    select: { id: true },
  })

  if (existing) {
    // If ID exists, increment and try again
    nextNumber++
    const retryPaddedNumber = nextNumber.toString().padStart(ID_LENGTH, '0')
    return `${BOOKING_ID_PREFIX}${retryPaddedNumber}`
  }

  return newId
}

/**
 * Validate booking ID format
 */
export function isValidBookingId(id: string): boolean {
  if (!id.startsWith(BOOKING_ID_PREFIX)) {
    return false
  }
  
  const numberPart = id.replace(BOOKING_ID_PREFIX, '')
  return /^\d+$/.test(numberPart) && numberPart.length <= ID_LENGTH
}
