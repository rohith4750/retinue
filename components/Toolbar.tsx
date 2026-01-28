'use client'

import { usePathname } from 'next/navigation'
import { FaBell, FaSearch, FaPlus, FaCalendarAlt, FaHome, FaUsers, FaBox, FaChartLine, FaHistory, FaUserShield, FaBuilding, FaUser, FaMoneyBillWave, FaMoon, FaSun } from 'react-icons/fa'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'

interface ToolbarProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Toolbar({ title, showSearch = false, actions }: ToolbarProps) {
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState<string>('')
  const { theme, toggleTheme } = useTheme()

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

  // Get page title and icon based on pathname
  const getPageInfo = () => {
    if (pathname?.startsWith('/dashboard')) return { title: 'Dashboard', icon: FaChartLine }
    if (pathname?.startsWith('/rooms')) return { title: 'Rooms', icon: FaHome }
    if (pathname?.startsWith('/function-halls/bookings/new')) return { title: 'New Hall Booking', icon: FaPlus }
    if (pathname?.startsWith('/function-halls/bookings')) return { title: 'Hall Bookings', icon: FaCalendarAlt }
    if (pathname?.startsWith('/function-halls')) return { title: 'Function Hall', icon: FaBuilding }
    if (pathname?.startsWith('/bookings/new')) return { title: 'New Booking', icon: FaPlus }
    if (pathname?.startsWith('/bookings/history')) return { title: 'Booking History', icon: FaHistory }
    if (pathname?.startsWith('/bookings')) return { title: 'Bookings', icon: FaCalendarAlt }
    if (pathname?.startsWith('/staff')) return { title: 'Staff Management', icon: FaUsers }
    if (pathname?.startsWith('/inventory')) return { title: 'Inventory', icon: FaBox }
    if (pathname?.startsWith('/auth/users')) return { title: 'User Management', icon: FaUserShield }
    if (pathname?.startsWith('/expenses')) return { title: 'Revenue & Expenses', icon: FaMoneyBillWave }
    if (pathname?.startsWith('/workforce')) return { title: 'Workforce & Salary', icon: FaUsers }
    if (pathname?.startsWith('/assets')) return { title: 'Asset Locator', icon: FaBox }
    if (pathname?.startsWith('/profile')) return { title: 'My Profile', icon: FaUser }
    if (pathname?.startsWith('/bills')) return { title: 'Bill Details', icon: FaCalendarAlt }
    return { title: 'The Retinue', icon: FaChartLine }
  }

  const pageInfo = getPageInfo()
  const PageIcon = pageInfo.icon
  const displayTitle = title || pageInfo.title

  // Quick action buttons based on current page
  const getQuickActions = () => {
    if (pathname?.startsWith('/bookings') && !pathname?.includes('/new')) {
      return (
        <Link
          href="/bookings/new"
          className="flex items-center space-x-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
        >
          <FaPlus className="w-3 h-3" />
          <span className="hidden sm:inline">New Booking</span>
        </Link>
      )
    }
    if (pathname?.startsWith('/rooms')) {
      return (
        <Link
          href="/bookings/new"
          className="flex items-center space-x-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
        >
          <FaPlus className="w-3 h-3" />
          <span className="hidden sm:inline">Book Room</span>
        </Link>
      )
    }
    return null
  }

  return (
    <header className="app-header fixed top-0 right-0 left-0 lg:left-64 z-20 backdrop-blur-xl border-b">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Page title */}
        <div className="flex items-center space-x-3 ml-12 lg:ml-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <PageIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold app-fg">{displayTitle}</h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Current time */}
          <div className="hidden md:flex items-center px-3 py-1.5 app-chip rounded-lg border">
            <span className="text-sm app-fg-muted font-medium">{currentTime}</span>
          </div>

          {/* Quick actions */}
          {actions || getQuickActions()}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border app-chip hover:opacity-90 transition-colors"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FaSun className="w-4 h-4 text-amber-400" /> : <FaMoon className="w-4 h-4 text-sky-500" />}
          </button>

          {/* Notifications - placeholder */}
          <button className="relative p-2 app-fg-muted hover:app-fg rounded-lg app-chip hover:opacity-90 transition-colors">
            <FaBell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </header>
  )
}
