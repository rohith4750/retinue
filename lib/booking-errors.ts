/**
 * Custom error classes for booking operations
 * Phase 2: Comprehensive error handling
 */

export class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'BookingError'
    Object.setPrototypeOf(this, BookingError.prototype)
  }
}

export class RoomUnavailableError extends BookingError {
  constructor(roomId: string, reason?: string) {
    super(
      reason || `Room ${roomId} is not available`,
      'ROOM_UNAVAILABLE',
      409
    )
    this.name = 'RoomUnavailableError'
  }
}

export class DateConflictError extends BookingError {
  constructor(message: string = 'Room is already booked for these dates') {
    super(message, 'DATE_CONFLICT', 409)
    this.name = 'DateConflictError'
  }
}

export class InvalidDateError extends BookingError {
  constructor(message: string) {
    super(message, 'INVALID_DATE', 400)
    this.name = 'InvalidDateError'
  }
}

export class InvalidStatusTransitionError extends BookingError {
  constructor(currentStatus: string, newStatus: string) {
    super(
      `Cannot transition from ${currentStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
      400
    )
    this.name = 'InvalidStatusTransitionError'
  }
}

export class ValidationError extends BookingError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}
