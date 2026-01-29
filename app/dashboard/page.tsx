'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FaHome, FaCheckCircle, FaCalendarAlt, FaDollarSign, FaExclamationTriangle, 
  FaBox, FaUsers, FaArrowUp, FaArrowDown, FaBed, FaBuilding, FaClock,
  FaChartLine, FaUserPlus, FaClipboardList, FaMoneyBillWave, FaPercentage,
  FaCalendarCheck, FaSignOutAlt, FaSignInAlt, FaTachometerAlt, FaUserTag
} from 'react-icons/fa'

const GUEST_TYPE_ORDER = ['WALK_IN', 'CORPORATE', 'OTA', 'REGULAR', 'FAMILY', 'GOVERNMENT', 'AGENT']
const GUEST_TYPE_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  WALK_IN: { bar: 'bg-violet-500', bg: 'bg-violet-500/20', text: 'text-violet-400' },
  CORPORATE: { bar: 'bg-sky-500', bg: 'bg-sky-500/20', text: 'text-sky-400' },
  OTA: { bar: 'bg-amber-500', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  REGULAR: { bar: 'bg-emerald-500', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  FAMILY: { bar: 'bg-rose-500', bg: 'bg-rose-500/20', text: 'text-rose-400' },
  GOVERNMENT: { bar: 'bg-indigo-500', bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  AGENT: { bar: 'bg-teal-500', bg: 'bg-teal-500/20', text: 'text-teal-400' },
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-800/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
                <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse mb-3" />
                <div className="h-8 w-20 bg-slate-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-slate-800/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 h-64">
                <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse mb-4" />
                <div className="h-40 bg-slate-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAdmin = user?.role === 'ADMIN'
  const canViewFinance = isSuperAdmin || isAdmin // Only SUPER_ADMIN and ADMIN can view financial data

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10 space-y-6">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FaTachometerAlt className="text-sky-400" />
              Dashboard Overview
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome back, {user?.username || 'User'}! Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookings/new"
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <FaCalendarAlt className="w-4 h-4" />
              New Booking
            </Link>
            <Link
              href="/function-halls/bookings/new"
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FaBuilding className="w-4 h-4" />
              Hall Booking
            </Link>
          </div>
        </div>

        {/* Quick Stats - Row 1 */}
        <div className={`grid grid-cols-2 ${canViewFinance ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          {/* Occupancy Rate */}
          <div className="bg-gradient-to-br from-sky-600/30 to-sky-800/20 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-sky-400/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <FaPercentage className="text-sky-400 text-xl" />
                <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  (stats?.occupancyRate || 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {(stats?.occupancyRate || 0) >= 70 ? 'Good' : 'Low'}
                </span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.occupancyRate || 0}%</p>
              <p className="text-xs text-slate-400 mt-1">Occupancy Rate</p>
            </div>
          </div>

          {/* Available Rooms */}
          <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-800/20 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <FaCheckCircle className="text-emerald-400 text-xl" />
                <span className="text-xs text-slate-400">of {stats?.totalRooms || 0}</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.availableRooms || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Available Rooms</p>
            </div>
          </div>

          {/* Today's Revenue - Only for ADMIN/SUPER_ADMIN */}
          {canViewFinance && (
            <div className="bg-gradient-to-br from-amber-600/30 to-amber-800/20 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <FaDollarSign className="text-amber-400 text-xl" />
                  <span className="text-xs text-slate-400">Today</span>
                </div>
                <p className="text-3xl font-bold text-white">₹{((stats?.todayRevenue || 0) / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-400 mt-1">Today&apos;s Revenue</p>
              </div>
            </div>
          )}

          {/* Today's Bookings - click to open bookings page filtered by today (checkout from there) */}
          <Link
            href={`/bookings?date=${new Date().toISOString().slice(0, 10)}`}
            className="block bg-gradient-to-br from-purple-600/30 to-purple-800/20 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden hover:border-purple-400/40 hover:from-purple-600/40 hover:to-purple-800/30 transition-all"
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <FaCalendarAlt className="text-purple-400 text-xl" />
                <span className="text-xs text-slate-400">Today</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats?.todayBookings || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Today&apos;s Bookings</p>
              <p className="text-[10px] text-purple-300/80 mt-1">Click to view & checkout</p>
            </div>
          </Link>
        </div>

        {/* Monthly Stats with Growth Indicators - Only for ADMIN/SUPER_ADMIN */}
        {canViewFinance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monthly Revenue */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-white mt-2">₹{(stats?.monthRevenue || 0).toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  (stats?.revenueGrowth || 0) >= 0 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {(stats?.revenueGrowth || 0) >= 0 ? <FaArrowUp className="w-3 h-3" /> : <FaArrowDown className="w-3 h-3" />}
                  {Math.abs(stats?.revenueGrowth || 0)}%
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">vs last month</span>
                <span className="text-slate-300">Hotel Revenue</span>
              </div>
            </div>

            {/* Monthly Bookings */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Monthly Bookings</p>
                  <p className="text-2xl font-bold text-white mt-2">{stats?.monthBookings || 0}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  (stats?.bookingGrowth || 0) >= 0 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {(stats?.bookingGrowth || 0) >= 0 ? <FaArrowUp className="w-3 h-3" /> : <FaArrowDown className="w-3 h-3" />}
                  {Math.abs(stats?.bookingGrowth || 0)}%
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">vs last month</span>
                <span className="text-slate-300">Room Bookings</span>
              </div>
            </div>

            {/* Hall Revenue */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Hall Revenue</p>
                  <p className="text-2xl font-bold text-white mt-2">₹{(stats?.hallRevenueThisMonth || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400">
                  <FaBuilding className="w-3 h-3" />
                  {stats?.hallBookingsThisMonth || 0}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">{stats?.totalHalls || 0} halls</span>
                <span className="text-slate-300">Convention Revenue</span>
              </div>
            </div>
          </div>
        )}

        {/* Charts & Analytics Section */}
        <div className={`grid grid-cols-1 ${canViewFinance ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Weekly Revenue Chart - Only for ADMIN/SUPER_ADMIN */}
          {canViewFinance && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FaChartLine className="text-sky-400" />
                    Weekly Revenue
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Last 7 days performance</p>
                </div>
              </div>
              <div className="h-48 flex items-end gap-2">
                {stats?.weeklyRevenue?.map((day: any, index: number) => {
                  const maxAmount = Math.max(...(stats?.weeklyRevenue?.map((d: any) => d.amount) || [1]))
                  const height = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
                  const isToday = index === (stats?.weeklyRevenue?.length || 0) - 1
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full relative" style={{ height: '140px' }}>
                        <div 
                          className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${
                            isToday 
                              ? 'bg-gradient-to-t from-sky-600 to-sky-400' 
                              : 'bg-gradient-to-t from-slate-700 to-slate-600'
                          }`}
                          style={{ height: `${Math.max(height, 5)}%` }}
                        >
                          {day.amount > 0 && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap">
                              ₹{(day.amount / 1000).toFixed(0)}K
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs ${isToday ? 'text-sky-400 font-semibold' : 'text-slate-500'}`}>
                        {day.day}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Room Status Distribution */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaBed className="text-amber-400" />
                  Room Status
                </h3>
                <p className="text-xs text-slate-400 mt-1">Current room distribution</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Available */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Available
                  </span>
                  <span className="text-sm font-semibold text-white">{stats?.availableRooms || 0}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.totalRooms ? ((stats?.availableRooms || 0) / stats.totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* Booked */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    Booked
                  </span>
                  <span className="text-sm font-semibold text-white">{stats?.bookedRooms || 0}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats?.totalRooms ? ((stats?.bookedRooms || 0) / stats.totalRooms) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              {/* Room Type Distribution */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider">By Room Type</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats?.roomsByType || {}).map(([type, count]: [string, any]) => (
                    <div key={type} className="px-3 py-1.5 bg-slate-800 rounded-lg">
                      <span className="text-xs text-slate-400">{type}</span>
                      <span className="text-sm font-semibold text-white ml-2">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Type Analytics */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaUserTag className="text-violet-400" />
                Customer Type Analytics
              </h3>
              <p className="text-xs text-slate-400 mt-1">Bookings & revenue by guest type</p>
            </div>
          </div>
          <div className={`grid grid-cols-1 ${canViewFinance ? 'lg:grid-cols-2' : ''} gap-6`}>
            {/* Bookings by customer type (all time) */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Bookings by type (all time)</p>
              <div className="space-y-4">
                {GUEST_TYPE_ORDER.map((type) => {
                  const data = stats?.bookingsByGuestType?.[type] || { count: 0, revenue: 0 }
                  const label = stats?.guestTypeLabels?.[type] || type.replace(/_/g, ' ')
                  const totalBookings = Object.values(stats?.bookingsByGuestType || {}).reduce((s: number, v: any) => s + (v?.count || 0), 0)
                  const pct = totalBookings > 0 ? Math.round((data.count / totalBookings) * 100) : 0
                  const colors = GUEST_TYPE_COLORS[type] || GUEST_TYPE_COLORS.WALK_IN
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-medium ${colors.text}`}>{label}</span>
                        <span className="text-sm text-slate-300">{data.count} <span className="text-slate-500">({pct}%)</span></span>
                      </div>
                      <div className="h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                          style={{ width: `${totalBookings > 0 ? (data.count / totalBookings) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Revenue by customer type this month (admin only) */}
            {canViewFinance && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Revenue this month by type</p>
                <div className="space-y-4">
                  {GUEST_TYPE_ORDER.map((type) => {
                    const data = stats?.bookingsByGuestTypeThisMonth?.[type] || { count: 0, revenue: 0 }
                    const label = stats?.guestTypeLabels?.[type] || type.replace(/_/g, ' ')
                    const totalRev = Object.values(stats?.bookingsByGuestTypeThisMonth || {}).reduce((s: number, v: any) => s + (v?.revenue || 0), 0)
                    const pct = totalRev > 0 ? Math.round((data.revenue / totalRev) * 100) : 0
                    const colors = GUEST_TYPE_COLORS[type] || GUEST_TYPE_COLORS.WALK_IN
                    return (
                      <div key={type} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-slate-800/40">
                        <div className={`w-2 h-8 rounded-full ${colors.bar}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${colors.text}`}>{label}</p>
                          <p className="text-xs text-slate-500">{data.count} booking(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-white">₹{(data.revenue || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{pct}% of month</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hall Analytics */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FaBuilding className="text-purple-400" />
                Hall Analytics
              </h3>
              <p className="text-xs text-slate-400 mt-1">Today, upcoming events, and monthly performance</p>
            </div>
          </div>

          {/* KPI Row */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 ${canViewFinance ? 'lg:grid-cols-4' : ''} gap-4 mb-6`}>
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Today&apos;s events</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.hallTodayBookings || 0}</p>
              <p className="text-[10px] text-slate-500 mt-1">By event date</p>
            </div>
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Upcoming (7 days)</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.hallUpcoming7Days || 0}</p>
              <p className="text-[10px] text-slate-500 mt-1">Pending + Confirmed</p>
            </div>
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Bookings this month</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.hallBookingsThisMonth || 0}</p>
              <p className="text-[10px] text-slate-500 mt-1">Created this month</p>
            </div>
            {canViewFinance && (
              <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4">
                <p className="text-xs text-slate-400">Revenue this month</p>
                <p className="text-2xl font-bold text-white mt-1">₹{(stats?.hallRevenueThisMonth || 0).toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-1">Advance received</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status breakdown */}
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Status (this month)</p>
              <div className="space-y-2">
                {[
                  { key: 'CONFIRMED', label: 'Confirmed', color: 'bg-emerald-500', text: 'text-emerald-400' },
                  { key: 'PENDING', label: 'Pending', color: 'bg-amber-500', text: 'text-amber-400' },
                  { key: 'COMPLETED', label: 'Completed', color: 'bg-slate-500', text: 'text-slate-300' },
                  { key: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500', text: 'text-red-400' },
                ].map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      {s.label}
                    </span>
                    <span className={`font-semibold ${s.text}`}>{stats?.hallStatusThisMonth?.[s.key] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top halls */}
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Top halls (this month)</p>
              <div className="space-y-2">
                {(stats?.topHallsThisMonth || []).slice(0, 5).map((h: any) => (
                  <div key={h.hallId} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-200 font-semibold truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{h.bookings || 0} booking(s)</p>
                    </div>
                    {canViewFinance ? (
                      <p className="text-white font-bold">₹{(h.revenue || 0).toLocaleString()}</p>
                    ) : (
                      <p className="text-slate-400 font-semibold">{h.bookings || 0}</p>
                    )}
                  </div>
                ))}
                {(!stats?.topHallsThisMonth || stats.topHallsThisMonth.length === 0) && (
                  <p className="text-xs text-slate-500">No hall data yet.</p>
                )}
              </div>
              {canViewFinance && (
                <p className="text-[10px] text-slate-500 mt-2">Ranked by booked value (total amount).</p>
              )}
            </div>

            {/* Event types */}
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Top event types (this month)</p>
              <div className="flex flex-wrap gap-2">
                {(stats?.hallEventTypesThisMonth || []).slice(0, 6).map((e: any) => (
                  <span
                    key={e.eventType}
                    className="px-2.5 py-1 rounded-full text-xs bg-purple-500/10 border border-purple-500/20 text-purple-300"
                    title={`${e.count} booking(s)`}
                  >
                    {e.eventType} <span className="text-purple-400 font-semibold ml-1">{e.count}</span>
                  </span>
                ))}
                {(!stats?.hallEventTypesThisMonth || stats.hallEventTypesThisMonth.length === 0) && (
                  <span className="text-xs text-slate-500">No event types yet.</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Based on bookings created this month.</p>
            </div>
          </div>
        </div>

        {/* Operational & Payment Insights */}
        <div className={`grid grid-cols-1 md:grid-cols-3 ${canViewFinance ? 'lg:grid-cols-4' : ''} gap-4`}>
          {/* Stay Metrics */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-500/20 rounded-xl">
                  <FaClock className="text-sky-400 text-lg" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Avg stay (this month)</p>
                  <p className="text-2xl font-bold text-white">{stats?.avgStayHoursThisMonth || 0}h</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Avg booking value</p>
                <p className="text-sm font-semibold text-slate-200">₹{(stats?.avgBookingValueThisMonth || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Operational Alerts */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaExclamationTriangle className="text-amber-400" />
              <p className="text-sm font-semibold text-white">Operational Alerts</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Overdue checkouts</span>
                <span className={`font-semibold ${(stats?.overdueCheckouts || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {stats?.overdueCheckouts || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Flexible checkout (TBD)</span>
                <span className={`font-semibold ${(stats?.flexibleCheckoutActive || 0) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {stats?.flexibleCheckoutActive || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Maintenance rooms</span>
                <span className={`font-semibold ${(stats?.maintenanceRooms || 0) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {stats?.maintenanceRooms || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Health (Admin only) */}
          {canViewFinance && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FaMoneyBillWave className="text-emerald-400" />
                <p className="text-sm font-semibold text-white">Payment Health</p>
              </div>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-400">Outstanding</p>
                  <p className="text-xl font-bold text-white">₹{(stats?.pendingPayments || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500">This month</p>
                  <p className="text-xs text-slate-300">
                    Paid: <span className="text-emerald-400 font-semibold">{stats?.paymentStatusThisMonth?.PAID || 0}</span>{' '}
                    • Partial: <span className="text-amber-400 font-semibold">{stats?.paymentStatusThisMonth?.PARTIAL || 0}</span>{' '}
                    • Pending: <span className="text-red-400 font-semibold">{stats?.paymentStatusThisMonth?.PENDING || 0}</span>
                  </p>
                </div>
              </div>
              <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                {(() => {
                  const paid = stats?.paymentStatusThisMonth?.PAID || 0
                  const partial = stats?.paymentStatusThisMonth?.PARTIAL || 0
                  const pending = stats?.paymentStatusThisMonth?.PENDING || 0
                  const total = paid + partial + pending
                  const paidPct = total > 0 ? (paid / total) * 100 : 0
                  const partialPct = total > 0 ? (partial / total) * 100 : 0
                  const pendingPct = total > 0 ? (pending / total) * 100 : 0
                  return (
                    <div className="flex h-full w-full">
                      <div className="bg-emerald-500" style={{ width: `${paidPct}%` }} />
                      <div className="bg-amber-500" style={{ width: `${partialPct}%` }} />
                      <div className="bg-red-500" style={{ width: `${pendingPct}%` }} />
                    </div>
                  )
                })()}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Split of payment statuses for bookings created this month</p>
            </div>
          )}

          {/* Top Rooms (Admin only) */}
          {canViewFinance && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FaBed className="text-purple-400" />
                  <p className="text-sm font-semibold text-white">Top Rooms (This Month)</p>
                </div>
              </div>
              <div className="space-y-2">
                {(stats?.topRoomsThisMonth || []).slice(0, 5).map((r: any) => (
                  <div key={r.roomId} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="text-slate-200 font-semibold truncate">Room {r.roomNumber}</p>
                      <p className="text-[10px] text-slate-500 truncate">{r.roomType}{typeof r.floor === 'number' ? ` • F${r.floor}` : ''}</p>
                    </div>
                    <p className="text-white font-bold">₹{(r.revenue || 0).toLocaleString()}</p>
                  </div>
                ))}
                {(!stats?.topRoomsThisMonth || stats.topRoomsThisMonth.length === 0) && (
                  <p className="text-xs text-slate-500">No revenue data yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions & Alerts */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${canViewFinance ? 'lg:grid-cols-4' : ''} gap-4`}>
          {/* Upcoming Check-ins */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/20 rounded-xl">
                <FaSignInAlt className="text-sky-400 text-lg" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.upcomingCheckIns || 0}</p>
                <p className="text-xs text-slate-400">Upcoming Check-ins</p>
              </div>
            </div>
          </div>

          {/* Upcoming Check-outs */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <FaSignOutAlt className="text-orange-400 text-lg" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.upcomingCheckOuts || 0}</p>
                <p className="text-xs text-slate-400">Today&apos;s Check-outs</p>
              </div>
            </div>
          </div>

          {/* Pending Payments - Only for ADMIN/SUPER_ADMIN */}
          {canViewFinance && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <FaMoneyBillWave className="text-red-400 text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">₹{((stats?.pendingPayments || 0) / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-slate-400">Pending Payments</p>
                </div>
              </div>
            </div>
          )}

          {/* Low Stock - Only for ADMIN/SUPER_ADMIN */}
          {canViewFinance && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${(stats?.lowStockAlerts || 0) > 0 ? 'bg-yellow-500/20' : 'bg-emerald-500/20'}`}>
                  <FaBox className={`text-lg ${(stats?.lowStockAlerts || 0) > 0 ? 'text-yellow-400' : 'text-emerald-400'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.lowStockAlerts || 0}</p>
                  <p className="text-xs text-slate-400">Low Stock Items</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Trend & Booking Status */}
        <div className={`grid grid-cols-1 ${canViewFinance ? 'lg:grid-cols-3' : ''} gap-6`}>
          {/* Monthly Revenue Trend - Only for ADMIN/SUPER_ADMIN */}
          {canViewFinance && (
            <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FaChartLine className="text-emerald-400" />
                    Revenue Trend
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Last 6 months comparison</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-amber-500"></span>
                    Hotel
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-purple-500"></span>
                    Convention
                  </span>
                </div>
              </div>
              <div className="h-56 flex items-end gap-3">
                {stats?.monthlyTrend?.map((month: any, index: number) => {
                  const maxAmount = Math.max(...(stats?.monthlyTrend?.map((m: any) => m.total) || [1]))
                  const hotelHeight = maxAmount > 0 ? (month.hotelRevenue / maxAmount) * 100 : 0
                  const hallHeight = maxAmount > 0 ? (month.hallRevenue / maxAmount) * 100 : 0
                  const isCurrentMonth = index === (stats?.monthlyTrend?.length || 0) - 1
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-1" style={{ height: '180px' }}>
                        {/* Hotel Revenue Bar */}
                        <div className="flex-1 relative">
                          <div 
                            className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${
                              isCurrentMonth 
                                ? 'bg-gradient-to-t from-amber-600 to-amber-400' 
                                : 'bg-gradient-to-t from-amber-700/60 to-amber-600/60'
                            }`}
                            style={{ height: `${Math.max(hotelHeight, 2)}%` }}
                          />
                        </div>
                        {/* Hall Revenue Bar */}
                        <div className="flex-1 relative">
                          <div 
                            className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${
                              isCurrentMonth 
                                ? 'bg-gradient-to-t from-purple-600 to-purple-400' 
                                : 'bg-gradient-to-t from-purple-700/60 to-purple-600/60'
                            }`}
                            style={{ height: `${Math.max(hallHeight, 2)}%` }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs ${isCurrentMonth ? 'text-white font-semibold' : 'text-slate-500'}`}>
                        {month.month}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ₹{(month.total / 1000).toFixed(0)}K
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Booking Status */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaClipboardList className="text-purple-400" />
                  Booking Status
                </h3>
                <p className="text-xs text-slate-400 mt-1">All time breakdown</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { status: 'CONFIRMED', label: 'Confirmed', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                { status: 'CHECKED_IN', label: 'Checked In', color: 'bg-sky-500', textColor: 'text-sky-400' },
                { status: 'CHECKED_OUT', label: 'Checked Out', color: 'bg-slate-500', textColor: 'text-slate-400' },
                { status: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500', textColor: 'text-red-400' },
              ].map((item) => {
                const count = stats?.bookingsByStatus?.[item.status] || 0
                const total = Object.values(stats?.bookingsByStatus || {}).reduce((a: number, b: any) => a + b, 0) as number
                const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0
                
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-slate-300 flex-1">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.textColor}`}>{count}</span>
                    <span className="text-xs text-slate-500 w-10 text-right">{percentage}%</span>
                  </div>
                )
              })}
            </div>
            
            {/* Guest Stats */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-slate-400" />
                  <span className="text-sm text-slate-300">Total Guests</span>
                </div>
                <span className="text-lg font-bold text-white">{stats?.totalGuests || 0}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <FaUserPlus className="text-emerald-400" />
                  <span className="text-sm text-slate-300">New this month</span>
                </div>
                <span className="text-lg font-bold text-emerald-400">+{stats?.newGuestsThisMonth || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Room Bookings */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaCalendarCheck className="text-sky-400" />
                  Recent Bookings
                </h3>
                <Link href="/bookings" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                  View all →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {stats?.recentBookings?.slice(0, 5).map((booking: any) => (
                <div key={booking.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                        <FaUsers className="text-sky-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{booking.guest?.name || 'Guest'}</p>
                        <p className="text-xs text-slate-400">Room {booking.room?.roomNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {canViewFinance && (
                        <p className="text-sm font-semibold text-white">₹{(booking.totalAmount || 0).toLocaleString()}</p>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        booking.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' :
                        booking.status === 'CHECKED_IN' ? 'bg-sky-500/20 text-sky-400' :
                        booking.status === 'CHECKED_OUT' ? 'bg-slate-500/20 text-slate-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.recentBookings || stats.recentBookings.length === 0) && (
                <div className="p-8 text-center">
                  <FaCalendarAlt className="text-3xl text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No recent bookings</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Hall Bookings */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaBuilding className="text-purple-400" />
                  Recent Hall Bookings
                </h3>
                <Link href="/function-halls/bookings" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  View all →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {stats?.recentHallBookings?.slice(0, 5).map((booking: any) => (
                <div key={booking.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <FaBuilding className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{booking.customerName || 'Customer'}</p>
                        <p className="text-xs text-slate-400">{booking.hall?.name || 'Hall'} • {booking.eventType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {canViewFinance && (
                        <p className="text-sm font-semibold text-white">₹{(booking.totalAmount || 0).toLocaleString()}</p>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        booking.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' :
                        booking.status === 'COMPLETED' ? 'bg-slate-500/20 text-slate-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.recentHallBookings || stats.recentHallBookings.length === 0) && (
                <div className="p-8 text-center">
                  <FaBuilding className="text-3xl text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No recent hall bookings</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Staff & Additional Info for Super Admin */}
        {isSuperAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <FaUsers className="text-indigo-400 text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.totalStaff || 0}</p>
                  <p className="text-xs text-slate-400">Active Staff</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-500/20 rounded-xl">
                  <FaHome className="text-teal-400 text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.totalRooms || 0}</p>
                  <p className="text-xs text-slate-400">Total Rooms</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/20 rounded-xl">
                  <FaBuilding className="text-rose-400 text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.totalHalls || 0}</p>
                  <p className="text-xs text-slate-400">Function Halls</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
