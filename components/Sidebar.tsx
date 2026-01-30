'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getStoredUser, clearAuth } from '@/lib/auth-storage'
import { FaHotel, FaChartLine, FaHome, FaCalendarAlt, FaBox, FaUsers, FaSignOutAlt, FaHistory, FaUserShield, FaBars, FaTimes, FaBuilding, FaMoneyBillWave, FaMapMarkerAlt, FaFileExcel, FaBrain, FaCog, FaWallet, FaClipboardList, FaUniversity, FaDatabase, FaReceipt } from 'react-icons/fa'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    setUser(getStoredUser())
  }, [])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  if (!user) return null

  // Hotel menu items
  const hotelMenuItems = [
    { href: '/dashboard', icon: FaChartLine, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/rooms', icon: FaHome, label: 'Rooms', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/bookings', icon: FaCalendarAlt, label: 'Bookings', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/bookings/online', icon: FaCalendarAlt, label: 'Online Bookings', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/bills', icon: FaReceipt, label: 'Bills', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/bookings/history', icon: FaHistory, label: 'History', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
  ]

  // Convention center menu items
  const conventionMenuItems = [
    { href: '/function-halls', icon: FaBuilding, label: 'Halls', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/function-halls/bookings', icon: FaCalendarAlt, label: 'Hall Bookings', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
  ]

  // Analytics & Reports menu items
  const analyticsMenuItems = [
    { href: '/analytics', icon: FaBrain, label: 'Predictions', roles: ['SUPER_ADMIN'] },
    { href: '/reports', icon: FaFileExcel, label: 'Reports', roles: ['SUPER_ADMIN'] },
  ]

  // Finance menu items
  const financeMenuItems = [
    { href: '/bank-accounts', icon: FaUniversity, label: 'Bank Accounts', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/expenses', icon: FaMoneyBillWave, label: 'Expenses', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/workforce', icon: FaWallet, label: 'Workforce', roles: ['SUPER_ADMIN'] },
  ]

  // Operations menu items
  const operationsMenuItems = [
    { href: '/inventory', icon: FaBox, label: 'Stock & Assets', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
    { href: '/staff', icon: FaUsers, label: 'Staff', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { href: '/assets', icon: FaMapMarkerAlt, label: 'Asset Locator', roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] },
  ]

  // Settings menu items
  const settingsMenuItems = [
    { href: '/auth/users', icon: FaUserShield, label: 'User Management', roles: ['SUPER_ADMIN'] },
    { href: '/admin/db-analytics', icon: FaDatabase, label: 'DB Analytics', roles: ['SUPER_ADMIN'] },
  ]

  // Filter menu items based on user role
  const filteredHotelItems = hotelMenuItems.filter(item => item.roles.includes(user.role))
  const filteredConventionItems = conventionMenuItems.filter(item => item.roles.includes(user.role))
  const filteredAnalyticsItems = analyticsMenuItems.filter(item => item.roles.includes(user.role))
  const filteredFinanceItems = financeMenuItems.filter(item => item.roles.includes(user.role))
  const filteredOperationsItems = operationsMenuItems.filter(item => item.roles.includes(user.role))
  const filteredSettingsItems = settingsMenuItems.filter(item => item.roles.includes(user.role))

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    // Online Bookings: dedicated route
    if (href === '/bookings/online') {
      return pathname === '/bookings/online'
    }
    // Bookings (staff): active only for exact /bookings (not /bookings/online)
    if (href === '/bookings') {
      return pathname === '/bookings'
    }
    return pathname?.startsWith(href.split('?')[0])
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900/80 backdrop-blur-xl p-2 rounded-lg border border-white/5 text-slate-100"
      >
        {isMobileOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 app-sidebar backdrop-blur-xl border-r shadow-[0_18px_60px_rgba(15,23,42,0.25)] z-40 transition-transform duration-300 overflow-y-auto sidebar-scrollbar ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-4 border-b border-white/5">
            <Link
              href="/dashboard"
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                  <FaHotel className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">Hotel The Retinue & Butchiraju Conventions</span>
                  <p className="text-[9px] text-slate-400">& Buchirajuu Convention</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Hotel Section */}
            {filteredHotelItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2">
                  <FaHotel className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Hotel & Conventions</span>
                </div>
                <div className="space-y-1">
                  {filteredHotelItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-amber-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Convention Center Section */}
            {filteredConventionItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2 pt-2 border-t border-white/5">
                  <FaBuilding className="w-3 h-3 text-sky-400" />
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Buchirajuu Convention</span>
                </div>
                <div className="space-y-1">
                  {filteredConventionItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-sky-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Analytics & Reports Section */}
            {filteredAnalyticsItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2 pt-2 border-t border-white/5">
                  <FaChartLine className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Analytics</span>
                </div>
                <div className="space-y-1">
                  {filteredAnalyticsItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-purple-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Finance Section */}
            {filteredFinanceItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2 pt-2 border-t border-white/5">
                  <FaWallet className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Finance</span>
                </div>
                <div className="space-y-1">
                  {filteredFinanceItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-emerald-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Operations Section */}
            {filteredOperationsItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2 pt-2 border-t border-white/5">
                  <FaClipboardList className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Operations</span>
                </div>
                <div className="space-y-1">
                  {filteredOperationsItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-orange-400'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Settings Section */}
            {filteredSettingsItems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2 pt-2 border-t border-white/5">
                  <FaCog className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settings</span>
                </div>
                <div className="space-y-1">
                  {filteredSettingsItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/5 space-y-3">
            <Link
              href="/profile"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center space-x-2 bg-slate-800/40 backdrop-blur-sm px-3 py-2 rounded-lg border transition-all duration-200 ${
                pathname === '/profile'
                  ? 'border-sky-500/30 bg-sky-500/10'
                  : 'border-white/5 hover:bg-slate-800/60 hover:border-white/10'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-white">{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{user.username}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.role.replace('_', ' ')}</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full bg-slate-800/60 hover:bg-slate-700/60 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 transition-all duration-200 border border-white/5 hover:border-white/10 flex items-center justify-center space-x-2"
            >
              <FaSignOutAlt className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
