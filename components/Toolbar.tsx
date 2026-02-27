'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { NotificationBell } from './dashboard/NotificationBell'
import { useState, useEffect } from 'react'
import { getPageInfo, getQuickAction } from '@/lib/navigation-config'

interface ToolbarProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Toolbar({ title, showSearch = false, actions }: ToolbarProps) {
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const pageInfo = getPageInfo(pathname)
  const PageIcon = pageInfo.icon
  const displayTitle = title || pageInfo.title

  const quickAction = getQuickAction(pathname)
  const QuickActionIcon = quickAction?.icon

  return (
    <header className="app-header fixed top-0 right-0 left-0 lg:left-72 2xl:left-80 z-20 backdrop-blur-xl border-b">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Page title */}
        <div className="flex items-center space-x-3 ml-12 lg:ml-0 min-w-0">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <PageIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold app-fg truncate">{displayTitle}</h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Current time */}
          <div className="hidden md:flex items-center px-3 py-1.5 app-chip rounded-lg border">
            <span className="text-sm app-fg-muted font-medium">{currentTime}</span>
          </div>

          {/* Quick actions */}
          {actions || (quickAction && (
            <Link
              href={quickAction.href}
              className="flex items-center space-x-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
            >
              {QuickActionIcon && <QuickActionIcon className="w-3 h-3" />}
              <span className="hidden sm:inline">{quickAction.label}</span>
            </Link>
          ))}

          {/* Notifications */}
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
