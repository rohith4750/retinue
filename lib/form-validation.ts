/**
 * Global form validation utilities
 * Reusable validation functions for client-side form validation
 */

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  custom?: (value: any) => string | null
  email?: boolean
  phone?: boolean
  date?: boolean
  number?: boolean
  min?: number
  max?: number
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule
}

export interface ValidationErrors {
  [fieldName: string]: string | null
}

/**
 * Validate a single field value against rules
 */
export function validateField(
  fieldName: string,
  value: any,
  rules: ValidationRule
): string | null {
  // Required check
  if (rules.required) {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`
    }
  }

  // Skip other validations if value is empty and not required
  if (!value && !rules.required) {
    return null
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `${fieldName} must be at most ${rules.maxLength} characters`
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.patternMessage || `${fieldName} format is invalid`
    }

    if (rules.email) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(value)) {
        return `${fieldName} must be a valid email address`
      }
    }

    if (rules.phone) {
      const phonePattern = /^[0-9]{10}$/
      if (!phonePattern.test(value)) {
        return `${fieldName} must be 10 digits`
      }
    }
  }

  // Number validations
  if (rules.number || rules.min !== undefined || rules.max !== undefined) {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) {
      return `${fieldName} must be a valid number`
    }

    if (rules.min !== undefined && numValue < rules.min) {
      return `${fieldName} must be at least ${rules.min}`
    }

    if (rules.max !== undefined && numValue > rules.max) {
      return `${fieldName} must be at most ${rules.max}`
    }
  }

  // Date validations
  if (rules.date) {
    const dateValue = new Date(value)
    if (isNaN(dateValue.getTime())) {
      return `${fieldName} must be a valid date`
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value)
    if (customError) {
      return customError
    }
  }

  return null
}

/**
 * Validate entire form data against validation rules
 */
export function validateForm(
  formData: Record<string, any>,
  rules: ValidationRules
): ValidationErrors {
  const errors: ValidationErrors = {}

  Object.keys(rules).forEach((fieldName) => {
    const value = formData[fieldName]
    const fieldRules = rules[fieldName]
    const error = validateField(fieldName, value, fieldRules)
    if (error) {
      errors[fieldName] = error
    }
  })

  return errors
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some((error) => error !== null)
}

/**
 * Common validation rules for booking forms
 */
export const bookingValidationRules: ValidationRules = {
  guestName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  guestPhone: {
    required: true,
    phone: true,
  },
  guestAddress: {
    maxLength: 500,
  },
  checkIn: {
    required: true,
    date: true,
    custom: (value) => {
      if (!value) return null
      const date = new Date(value)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      if (date < now) {
        return 'Check-in date cannot be in the past'
      }
      return null
    },
  },
  checkOut: {
    required: true,
    date: true,
    custom: (value) => {
      if (!value) return null
      // This will be validated in the component where we have access to both dates
      return null
    },
  },
  roomIds: {
    required: true,
    custom: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) {
        return 'Please select at least one room'
      }
      return null
    },
  },
  discount: {
    number: true,
    min: 0,
    max: 100000,
  },
}

/** Same as bookingValidationRules but allows past check-in (for edit booking page). */
export const editBookingValidationRules: ValidationRules = {
  ...bookingValidationRules,
  checkIn: {
    required: true,
    date: true,
    custom: () => null, // Allow past check-in when editing
  },
}
