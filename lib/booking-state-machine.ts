/**
 * Booking status state machine
 * Phase 2: Enforce valid status transitions
 */

import { BookingStatus } from '@prisma/client'
import { InvalidStatusTransitionError } from './booking-errors'

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [], // Terminal state
  CANCELLED: [] // Terminal state
}

/**
 * Check if status transition is valid
 */
export function canTransitionStatus(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Validate and throw if transition is invalid
 */
export function validateStatusTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): void {
  if (!canTransitionStatus(currentStatus, newStatus)) {
    throw new InvalidStatusTransitionError(currentStatus, newStatus)
  }
}

/**
 * Get allowed next statuses
 */
export function getAllowedNextStatuses(currentStatus: BookingStatus): BookingStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || []
}
