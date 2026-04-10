'use client'

import { FaExclamationTriangle, FaCheck, FaTimes } from 'react-icons/fa'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const typeConfig = {
    danger: {
      icon: <FaExclamationTriangle className="w-6 h-6 text-red-500" />,
      buttonClass: 'bg-red-600 hover:bg-red-500',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]'
    },
    warning: {
      icon: <FaExclamationTriangle className="w-6 h-6 text-amber-500" />,
      buttonClass: 'bg-amber-600 hover:bg-amber-500',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
    },
    info: {
      icon: <FaCheck className="w-6 h-6 text-sky-500" />,
      buttonClass: 'bg-sky-600 hover:bg-sky-500',
      glow: 'shadow-[0_0_20px_rgba(14,165,233,0.2)]'
    }
  }

  const { icon, buttonClass, glow } = typeConfig[type]

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onCancel} 
      />
      <div className={`relative bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm overflow-hidden ${glow}`}>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-slate-800 rounded-xl border border-white/5">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-white/5"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all ${buttonClass} shadow-lg shadow-black/20`}
          >
            {confirmText}
          </button>
        </div>
        
        {/* Subtle accent line */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${buttonClass.split(' ')[0]}`} />
      </div>
    </div>
  )
}
