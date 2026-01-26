'use client'

import { useState, useCallback } from 'react'
import {
  validateForm,
  validateField,
  ValidationRules,
  ValidationErrors,
  hasErrors,
} from '@/lib/form-validation'

export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: ValidationRules
) {
  const [formData, setFormData] = useState<T>(initialData)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Update form data
  const updateField = useCallback(
    (fieldName: keyof T, value: any) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }))
      
      // Clear error when user starts typing
      if (errors[fieldName as string]) {
        setErrors((prev) => ({ ...prev, [fieldName as string]: null }))
      }
    },
    [errors]
  )

  // Validate single field
  const validateSingleField = useCallback(
    (fieldName: string, customRules?: ValidationRules) => {
      const fieldRules = customRules?.[fieldName] || rules[fieldName]
      if (!fieldRules) return

      // For checkOut, we need access to checkIn
      if (fieldName === 'checkOut' && formData.checkIn) {
        const checkOut = new Date(formData.checkOut)
        const checkIn = new Date(formData.checkIn)
        if (checkOut <= checkIn) {
          setErrors((prev) => ({ ...prev, [fieldName]: 'Check-out date must be after check-in date' }))
          setTouched((prev) => ({ ...prev, [fieldName]: true }))
          return
        }
      }

      const error = validateField(fieldName, formData[fieldName], fieldRules)
      setErrors((prev) => ({ ...prev, [fieldName]: error }))
      setTouched((prev) => ({ ...prev, [fieldName]: true }))
    },
    [formData, rules]
  )

  // Validate entire form
  const validate = useCallback(() => {
    const newErrors = validateForm(formData, rules)
    
    // Custom validation for checkOut that depends on checkIn
    if (formData.checkOut && formData.checkIn) {
      const checkOut = new Date(formData.checkOut)
      const checkIn = new Date(formData.checkIn)
      if (checkOut <= checkIn) {
        newErrors.checkOut = 'Check-out date must be after check-in date'
      }
    }
    
    setErrors(newErrors)
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    Object.keys(rules).forEach((key) => {
      allTouched[key] = true
    })
    setTouched(allTouched)

    return !hasErrors(newErrors)
  }, [formData, rules])

  // Handle field blur
  const handleBlur = useCallback(
    (fieldName: string) => {
      validateSingleField(fieldName)
    },
    [validateSingleField]
  )

  // Reset form
  const reset = useCallback(() => {
    setFormData(initialData)
    setErrors({})
    setTouched({})
  }, [initialData])

  // Get error for specific field
  const getError = useCallback(
    (fieldName: string) => {
      return errors[fieldName] || null
    },
    [errors]
  )

  // Check if field is touched
  const isTouched = useCallback(
    (fieldName: string) => {
      return touched[fieldName] || false
    },
    [touched]
  )

  return {
    formData,
    errors,
    touched,
    updateField,
    validate,
    validateSingleField,
    handleBlur,
    reset,
    getError,
    isTouched,
    setFormData,
    hasErrors: hasErrors(errors),
  }
}
