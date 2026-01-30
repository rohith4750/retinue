/**
 * Booking validation utilities
 * Phase 1: Date validation, availability checks, conflict detection
 */

import { z } from 'zod'
import { prisma } from './prisma'

// Zod schema for booking creation
export const createBookingSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  slotId: z.string().optional(),
  guestName: z.string().min(2, 'Guest name must be at least 2 characters').max(100),
  guestPhone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  guestIdProof: z.string().optional(),
  guestIdProofType: z.enum(['AADHAR', 'PASSPORT', 'DRIVING_LICENSE', 'PAN_CARD', 'VOTER_ID', 'OTHER']).optional(),
  guestAddress: z.string().optional(),
  // Accept both date strings (YYYY-MM-DD) and ISO datetime strings
  checkIn: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid check-in date'),
  checkOut: z.string().refine((val) => {
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid check-out date'),
  totalAmount: z.number().min(0, 'Total amount must be positive'),
  discount: z.number().min(0).max(100000).optional().default(0),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI', 'NET_BANKING', 'WALLET', 'CHEQUE']).optional().default('CASH'),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>

/** Hotel policy: minimum 12 hours stay; multi-day bookings allowed */
const MIN_STAY_HOURS = 12

/**
 * Validate booking dates (multi-day allowed; minimum 12 hours)
 */
export function validateBookingDates(checkIn: Date, checkOut: Date): { valid: boolean; error?: string } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Check-in must be today or in future
  if (checkIn < now) {
    return { valid: false, error: 'Check-in date cannot be in the past' }
  }

  // Check-out must be after check-in
  if (checkOut <= checkIn) {
    return { valid: false, error: 'Check-out date must be after check-in date' }
  }

  const stayMs = checkOut.getTime() - checkIn.getTime()
  const stayHours = stayMs / (1000 * 60 * 60)

  if (stayHours < MIN_STAY_HOURS) {
    return { valid: false, error: `Minimum stay is ${MIN_STAY_HOURS} hours` }
  }

  return { valid: true }
}

/**
 * Check for date conflicts with existing bookings.
 * Check-out day = available: existing booking does not block the room on its check-out date.
 */
export async function checkDateConflicts(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBooking?: any }> {
  const overlapping = await prisma.booking.findMany({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      AND: [
        { checkIn: { lt: checkOut } },
        { checkOut: { gt: checkIn } },
      ],
    },
    include: {
      guest: true,
      room: true,
    },
  })

  const checkInStart = new Date(checkIn)
  checkInStart.setHours(0, 0, 0, 0)
  const conflictingBooking = overlapping.find((b) => {
    const checkoutDayStart = new Date(b.checkOut)
    checkoutDayStart.setHours(0, 0, 0, 0)
    return checkoutDayStart > checkInStart
  })

  return {
    hasConflict: conflictingBooking != null,
    conflictingBooking: conflictingBooking ?? undefined,
  }
}

/**
 * Comprehensive room availability check.
 * Check-out day = available: occupancy ends at start of check-out day.
 */
export async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ available: boolean; reason?: string }> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: checkOut } },
            { checkOut: { gt: checkIn } },
          ],
        },
      },
    },
  })

  if (!room) {
    return { available: false, reason: 'Room not found' }
  }

  if (room.status === 'MAINTENANCE') {
    return { available: false, reason: 'Room is under maintenance' }
  }

  const checkInStart = new Date(checkIn)
  checkInStart.setHours(0, 0, 0, 0)
  const blocking = room.bookings.some((b) => {
    const checkoutDayStart = new Date(b.checkOut)
    checkoutDayStart.setHours(0, 0, 0, 0)
    return checkoutDayStart > checkInStart
  })
  if (blocking) {
    return { available: false, reason: 'Room is already booked for these dates' }
  }

  return { available: true }
}

/**
 * Calculate booking price (multi-day: charge per full 24h day)
 */
export function calculateBookingPrice(
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  discount: number = 0
) {
  const stayMs = checkOut.getTime() - checkIn.getTime()
  const stayHours = stayMs / (1000 * 60 * 60)
  const days = Math.max(1, Math.ceil(stayHours / 24))
  const baseAmount = basePrice * days
  const discountAmount = Math.min(discount, baseAmount * 0.5) // Max 50% discount
  const subtotal = baseAmount - discountAmount
  const tax = subtotal * 0.18 // 18% GST
  const totalAmount = subtotal + tax

  return {
    days,
    baseAmount,
    discountAmount,
    subtotal,
    tax,
    totalAmount
  }
}

/** Minimum stay hours threshold: below this we charge minimum (half day); 12+ hours = full day(s) */
const EARLY_CHECKOUT_MINIMUM_HOURS = 12

/**
 * Calculate final amount for early checkout.
 * - Below 12 hours: minimum charge (half day = 50% of base price).
 * - 12 hours and above: charge by full day(s) (basePrice * ceil(hours/24)).
 * Receptionist uses this to finalize payment at checkout.
 */
export function calculateEarlyCheckoutAmount(
  checkIn: Date,
  actualCheckOut: Date,
  basePrice: number,
  applyGst: boolean = true
): { totalAmount: number; subtotal: number; tax: number; chargeType: 'MINIMUM' | 'DAILY'; hours: number; days: number; breakdown: string } {
  const stayMs = actualCheckOut.getTime() - checkIn.getTime()
  const hours = stayMs / (1000 * 60 * 60)

  let subtotal: number
  let chargeType: 'MINIMUM' | 'DAILY'
  let days = 0

  if (hours < EARLY_CHECKOUT_MINIMUM_HOURS) {
    // Minimum charge = half day rate
    subtotal = basePrice * 0.5
    chargeType = 'MINIMUM'
  } else {
    // Full day(s): ceil(hours/24) days
    days = Math.ceil(hours / 24)
    subtotal = basePrice * days
    chargeType = 'DAILY'
  }

  const tax = applyGst ? Math.round(subtotal * 0.18) : 0
  const totalAmount = subtotal + tax

  const breakdown =
    chargeType === 'MINIMUM'
      ? `Early checkout < 12h: minimum (½ day) ₹${subtotal.toFixed(0)} + GST ₹${tax}`
      : `Early checkout ${days} day(s): ₹${subtotal.toFixed(0)} + GST ₹${tax}`

  return {
    totalAmount,
    subtotal,
    tax,
    chargeType,
    hours,
    days: chargeType === 'DAILY' ? days : 0,
    breakdown,
  }
}
