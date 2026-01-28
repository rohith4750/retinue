/**
 * Application-wide constants
 */

// API Configuration
export const API_BASE = '/api'
export const API_TIMEOUT = 30000 // 30 seconds

// Pagination
export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100

// Booking Constants
export const BOOKING_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
} as const

export const ROOM_STATUSES = {
  AVAILABLE: 'AVAILABLE',
  BOOKED: 'BOOKED',
  MAINTENANCE: 'MAINTENANCE',
  OCCUPIED: 'OCCUPIED',
} as const

export const ROOM_TYPES = {
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE',
  SUITE: 'SUITE',
  DELUXE: 'DELUXE',
} as const

// User Roles
export const USER_ROLES = {
  RECEPTIONIST: 'RECEPTIONIST',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const

// Payment Constants
export const GST_RATE = 0.18 // 18%
export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const

// Date Formats
export const DATE_FORMAT = 'YYYY-MM-DD'
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'
export const DISPLAY_DATE_FORMAT = 'DD MMM YYYY'
export const DISPLAY_DATETIME_FORMAT = 'DD MMM YYYY, HH:mm'

// Session & Auth
export const SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8 hours (full work day)
export const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

// Password Requirements
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_REQUIRE_UPPERCASE = true
export const PASSWORD_REQUIRE_LOWERCASE = true
export const PASSWORD_REQUIRE_NUMBER = true
export const PASSWORD_REQUIRE_SPECIAL = true
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

// Inventory
export const LOW_STOCK_THRESHOLD = 10

// Toast Notifications
export const TOAST_DURATION = 3000
export const TOAST_POSITION = 'top-right' as const

// Query Configuration
export const QUERY_STALE_TIME = 5 * 60 * 1000 // 5 minutes
export const QUERY_CACHE_TIME = 10 * 60 * 1000 // 10 minutes

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  SEARCH: 'ctrl+k',
  NEW_BOOKING: 'ctrl+n',
  ESCAPE: 'escape',
} as const

// File Upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Export Formats
export const EXPORT_FORMATS = {
  CSV: 'csv',
  EXCEL: 'xlsx',
  PDF: 'pdf',
} as const
