
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'BOOKING' | 'ALERT'
  link?: string
  isRead: boolean
  createdAt: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.get('/notifications?limit=20')
      // api.get returns the response body (ApiResponse) directly
      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = async (ids: string[]) => {
    try {
      await api.patch('/notifications', { notificationIds: ids })
      // If no error thrown, success
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - ids.length))
    } catch (error) {
      console.error('Failed to mark notifications as read', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications', { markAllRead: true })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read', error)
    }
  }

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}
