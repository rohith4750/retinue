'use client'

import { FaSpinner } from 'react-icons/fa'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <FaSpinner className={`${sizeClasses[size]} animate-spin text-sky-400`} />
      {text && <p className="mt-2 text-sm text-slate-400">{text}</p>}
    </div>
  )
}
