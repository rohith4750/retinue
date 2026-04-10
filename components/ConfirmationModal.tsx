'use client'

import { FaExclamationTriangle, FaTrash, FaCheckCircle, FaEdit, FaTimes, FaInfoCircle } from 'react-icons/fa'

interface ConfirmationModalProps {
  show: boolean
  title: string
  message: string
  action?: string
  type?: 'delete' | 'update' | 'warning' | 'info' | 'danger'
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
      case 'danger':
        return <FaTrash className="w-6 h-6 text-red-500" />
      case 'update':
        return <FaEdit className="w-6 h-6 text-sky-500" />
      case 'warning':
        return <FaExclamationTriangle className="w-6 h-6 text-amber-500" />
      case 'info':
        return <FaInfoCircle className="w-6 h-6 text-sky-500" />
      default:
        return <FaCheckCircle className="w-6 h-6 text-emerald-500" />
    }
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'delete':
      case 'danger':
        return {
          buttonClass: 'bg-red-600 hover:bg-red-500',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
          border: 'border-red-500/20'
        }
      case 'update':
      case 'info':
        return {
          buttonClass: 'bg-sky-600 hover:bg-sky-500',
          glow: 'shadow-[0_0_20px_rgba(14,165,233,0.2)]',
          border: 'border-sky-500/20'
        }
      case 'warning':
      default:
        return {
          buttonClass: 'bg-amber-600 hover:bg-amber-500',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
          border: 'border-amber-500/20'
        }
    }
  }

  const { buttonClass, glow, border } = getTypeStyles()

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onCancel} 
      />
      <div className={`relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm overflow-hidden ${glow}`}>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-slate-800 rounded-xl border border-white/5">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-white/5 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all ${buttonClass} shadow-lg shadow-black/20 disabled:opacity-50`}
          >
            {isLoading ? 'Wait...' : confirmText || (action ? `Confirm ${action}` : 'Confirm')}
          </button>
        </div>
        
        {/* Subtle accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${buttonClass.split(' ')[0]}`} />
      </div>
    </div>
  )
}
