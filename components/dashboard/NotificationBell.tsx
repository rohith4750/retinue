
'use client'

import { useState, useRef, useEffect } from 'react'
import { FaBell, FaCheck, FaExclamationCircle, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa'
import { useNotifications, Notification } from '@/hooks/use-notifications'
import Link from 'next/link'

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMarkAsRead = (id: string) => {
        markAsRead([id])
    }

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'SUCCESS': return <FaCheckCircle className="w-4 h-4 text-green-500" />
            case 'WARNING': return <FaExclamationTriangle className="w-4 h-4 text-yellow-500" />
            case 'ERROR': return <FaExclamationCircle className="w-4 h-4 text-red-500" />
            case 'BOOKING': return <FaCalendarAlt className="w-4 h-4 text-sky-500" />
            case 'ALERT': return <FaBell className="w-4 h-4 text-purple-500" />
            default: return <FaInfoCircle className="w-4 h-4 text-blue-500" />
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 app-fg-muted hover:app-fg rounded-lg app-chip hover:opacity-90 transition-colors focus:outline-none"
                aria-label="Notifications"
            >
                <FaBell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-slate-100">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead()}
                                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                <FaBell className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                                No notifications yet
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-700/30">
                                {notifications.map((notification) => (
                                    <li
                                        key={notification.id}
                                        className={`p-3 hover:bg-slate-800/50 transition-colors ${!notification.isRead ? 'bg-slate-800/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getIcon(notification.type as any)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium ${!notification.isRead ? 'text-slate-100' : 'text-slate-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                            className="text-slate-500 hover:text-sky-400 transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <div className="w-2 h-2 rounded-full bg-sky-500" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[10px] text-slate-500">
                                                        {new Date(notification.createdAt).toLocaleString()}
                                                    </span>
                                                    {notification.link && (
                                                        <Link
                                                            href={notification.link}
                                                            onClick={() => {
                                                                setIsOpen(false)
                                                                if (!notification.isRead) handleMarkAsRead(notification.id)
                                                            }}
                                                            className="text-[10px] text-sky-400 hover:text-sky-300 font-medium"
                                                        >
                                                            View Details
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
