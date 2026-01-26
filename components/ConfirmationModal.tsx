'use client'

import { FaExclamationTriangle, FaTrash, FaCheckCircle, FaEdit } from 'react-icons/fa'

interface ConfirmationModalProps {
  show: boolean
  title: string
  message: string
  action: string
  type?: 'delete' | 'update' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  confirmText?: string
  cancelText?: string
}

export function ConfirmationModal({
  show,
  title,
  message,
  action,
  type = 'warning',
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText,
  cancelText = 'Cancel',
}: ConfirmationModalProps) {
  if (!show) return null

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <FaTrash className="mr-2 w-4 h-4 text-red-400" />
      case 'update':
        return <FaEdit className="mr-2 w-4 h-4 text-sky-400" />
      case 'warning':
        return <FaExclamationTriangle className="mr-2 w-4 h-4 text-yellow-400" />
      default:
        return <FaCheckCircle className="mr-2 w-4 h-4 text-sky-400" />
    }
  }

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'delete':
        return 'btn-danger'
      default:
        return 'btn-primary'
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 relative z-10">
          <div className="card-header">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              {getIcon()}
              {title}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{message}</p>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-300">
              This action cannot be undone. Please confirm to proceed.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-white/5 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary text-sm px-4 py-2"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`${getConfirmButtonClass()} text-sm px-4 py-2`}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmText || `Confirm ${action}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
