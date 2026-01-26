'use client'

import { IconType } from 'react-icons'

interface EmptyStateProps {
  icon: IconType
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card text-center py-12">
      <div className="flex flex-col items-center">
        <Icon className="text-4xl mb-3 text-slate-500" />
        <p className="text-base font-semibold text-slate-300 mb-1.5">{title}</p>
        {description && (
          <p className="text-xs text-slate-500 mb-4">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="btn-primary text-sm px-4 py-2"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
