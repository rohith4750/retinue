'use client'

import React from 'react'

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | null
  helperText?: string
}

export function FormTextarea({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: FormTextareaProps) {
  const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="form-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`form-textarea ${error ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center space-x-1">
          <svg
            className="w-3 h-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  )
}
