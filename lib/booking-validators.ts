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

/**
 * Validate booking dates
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
  
  // Maximum stay limit (30 days)
  const maxDays = 30
  const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  if (days > maxDays) {
    return { valid: false, error: `Maximum stay is ${maxDays} days` }
  }
  
  // Minimum stay (1 day)
  if (days < 1) {
    return { valid: false, error: 'Minimum stay is 1 day' }
  }
  
  return { valid: true }
}

/**
 * Check for date conflicts with existing bookings
 */
export async function checkDateConflicts(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflictingBooking?: any }> {
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      OR: [
        {
          // Check-in overlaps
          checkIn: { lte: checkOut },
          checkOut: { gte: checkIn }
        }
      ]
    },
    include: {
      guest: true,
      room: true
    }
  })
  
  return {
    hasConflict: conflictingBooking !== null,
    conflictingBooking: conflictingBooking || undefined
  }
}

/**
 * Comprehensive room availability check
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
          OR: [
            {
              checkIn: { lte: checkOut },
              checkOut: { gte: checkIn }
            }
          ]
        }
      }
    }
  })
  
  if (!room) {
    return { available: false, reason: 'Room not found' }
  }
  
  if (room.status === 'MAINTENANCE') {
    return { available: false, reason: 'Room is under maintenance' }
  }
  
  if (room.bookings.length > 0) {
    return { available: false, reason: 'Room is already booked for these dates' }
  }
  
  return { available: true }
}

/**
 * Calculate booking price
 */
export function calculateBookingPrice(
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  discount: number = 0
) {
  const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
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
