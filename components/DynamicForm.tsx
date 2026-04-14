'use client'

import React from 'react'
import { FormInput, FormSelect, FormTextarea } from './FormComponents'

export interface FormFieldOption {
  value: string
  label: string
}

export type FormFieldType = 'text' | 'tel' | 'email' | 'select' | 'textarea' | 'custom'

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  placeholder?: string
  options?: FormFieldOption[]
  className?: string
  rows?: number
  // Custom render for complex fields
  render?: (props: {
    field: FormField
    formData: any
    error?: string
    updateField: (name: string, value: any) => void
    handleBlur: (name: string) => void
  }) => React.ReactNode
  // Conditional rendering
  hidden?: (formData: any) => boolean
  // Input specific overrides
  onChange?: (e: any) => void
  onBlur?: () => void
  maxLength?: number
  minLength?: number
  pattern?: string
}

interface DynamicFormProps {
  schema: FormField[]
  formData: any
  errors: Record<string, string | null | undefined>
  updateField: (name: any, value: any) => void
  handleBlur: (name: any) => void
  gridClassName?: string
}

export function DynamicForm({
  schema,
  formData,
  errors,
  updateField,
  handleBlur,
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
}: DynamicFormProps) {
  return (
    <div className={gridClassName}>
      {schema.map((field) => {
        if (field.hidden && field.hidden(formData)) return null

        const commonProps = {
          label: field.label,
          value: formData[field.name] || '',
          onChange: field.onChange || ((e: any) => {
            const val = e.target.value
            updateField(field.name, val)
          }),
          onBlur: field.onBlur || (() => handleBlur(field.name)),
          error: errors[field.name] || undefined,
          placeholder: field.placeholder,
          className: field.className,
          maxLength: field.maxLength,
          minLength: field.minLength,
          pattern: field.pattern,
        }

        if (field.type === 'custom' && field.render) {
          return (
            <div key={field.name} className={field.className}>
              {field.render({
                field,
                formData,
                error: errors[field.name] || undefined,
                updateField,
                handleBlur
              })}
            </div>
          )
        }

        switch (field.type) {
          case 'select':
            return (
              <FormSelect
                key={field.name}
                {...commonProps}
                options={field.options || []}
              />
            )
          case 'textarea':
            return (
              <FormTextarea
                key={field.name}
                {...commonProps}
                rows={field.rows || 3}
              />
            )
          case 'tel':
          case 'email':
          case 'text':
          default:
            return (
              <FormInput
                key={field.name}
                {...commonProps}
                type={field.type === 'custom' ? 'text' : field.type}
              />
            )
        }
      })}
    </div>
  )
}
