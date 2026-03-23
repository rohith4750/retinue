'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FaArrowLeft, FaChartLine, FaBuilding, FaUsers, FaMoneyBillWave,
  FaBed, FaCalendarAlt, FaChartPie, FaChartBar, FaUserTag, FaClock,
  FaCalendarCheck
} from 'react-icons/fa'
import moment from 'moment'

const GUEST_TYPE_COLORS: Record<string, string> = {
  WALK_IN: 'bg-violet-500',
  CORPORATE: 'bg-sky-500',
  OTA: 'bg-amber-500',
  REGULAR: 'bg-emerald-500',
  FAMILY: 'bg-rose-500',
  GOVERNMENT: 'bg-indigo-500',
  AGENT: 'bg-teal-500',
}

function AnalyticsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = searchParams.get('view') || 'revenue'
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'))

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'current', selectedMonth, 'month'],
    queryFn: () => api.get(`/dashboard?date=${moment().format('YYYY-MM-DD')}&month=${selectedMonth}&type=month`).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium animate-pulse">Consolidating analytics...</p>
      </div>
    )
  }

  const renderRevenueAnalytics = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <p className="text-xs text-amber-500 uppercase font-black tracking-widest mb-1">Hotel Performance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">₹{(stats?.monthRevenue || 0).toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-bold">↑ {stats?.revenueGrowth || 0}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">vs last month revenue</p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <p className="text-xs text-purple-500 uppercase font-black tracking-widest mb-1">Convention Hall</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">₹{(stats?.hallRevenueThisMonth || 0).toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-bold">Stable</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Total from {stats?.totalHalls || 0} halls</p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FaChartLine className="text-emerald-400" />
            Revenue Growth Trend
          </h3>
          <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Hotel</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Hall</div>
          </div>
        </div>
        <div className="h-64 flex items-end gap-2 md:gap-4 overflow-x-auto pb-4 no-scrollbar">
          {stats?.monthlyTrend?.map((m: any, i: number) => {
            const max = Math.max(...stats.monthlyTrend.map((x: any) => x.total) || [1])
            const hPct = (m.hotelRevenue / max) * 100
            const cPct = (m.hallRevenue / max) * 100
            const isLast = i === stats.monthlyTrend.length - 1
            return (
              <div key={i} className="flex-1 min-w-[60px] flex flex-col items-center gap-3">
                <div className="w-full h-48 flex items-end gap-1 px-1">
                   <div className={`flex-1 rounded-t-md ${isLast ? 'bg-amber-500' : 'bg-amber-500/40'}`} style={{ height: `${Math.max(hPct, 4)}%` }} />
                   <div className={`flex-1 rounded-t-md ${isLast ? 'bg-purple-500' : 'bg-purple-500/40'}`} style={{ height: `${Math.max(cPct, 4)}%` }} />
                </div>
                <div className="text-center">
                  <p className={`text-[10px] uppercase font-black ${isLast ? 'text-white' : 'text-slate-500'}`}>{m.month}</p>
                  <p className="text-[9px] text-slate-600 font-bold">₹{(m.total/1000).toFixed(0)}k</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderBookingAnalytics = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Total Bookings</p>
            <p className="text-4xl font-black text-indigo-400 leading-none">{stats?.monthBookings || 0}</p>
            <p className="text-xs text-slate-600 mt-2 font-bold">{stats?.newGuestsThisMonth || 0} new guests this month</p>
         </div>
         <div className="md:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
            <h4 className="text-xs text-slate-400 uppercase font-black mb-4">Reservation Status Breakdown</h4>
            <div className="space-y-3">
               {['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].map(s => {
                 const count = stats?.bookingsByStatus?.[s] || 0
                 const total = Object.values(stats?.bookingsByStatus || {}).reduce((a:any, b:any) => a+b, 0) as number
                 const pct = total > 0 ? (count / total) * 100 : 0
                 const colors:any = { CONFIRMED: 'bg-emerald-500', CHECKED_IN: 'bg-sky-500', CHECKED_OUT: 'bg-slate-500', CANCELLED: 'bg-rose-500' }
                 return (
                   <div key={s} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span className="text-slate-400">{s.replace('_', ' ')}</span>
                        <span className="text-white">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[s]}`} style={{ width: `${pct}%` }} />
                      </div>
                   </div>
                 )
               })}
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <FaUsers className="text-indigo-400" />
            Guest Type Distribution
          </h4>
          <div className="space-y-4">
            {Object.entries(stats?.bookingsByGuestType || {}).map(([type, count]: any) => (
              <div key={type} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${GUEST_TYPE_COLORS[type] || 'bg-slate-500'}`} />
                <span className="text-xs text-slate-400 flex-1 font-bold">{type}</span>
                <span className="text-sm font-black text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <FaBed className="text-sky-400" />
            Room Type Performance
          </h4>
          <div className="space-y-4">
            {Object.entries(stats?.bookingsByRoomType || {}).map(([type, count]: any) => (
              <div key={type} className="flex items-center gap-4">
                <div className="flex-1">
                   <p className="text-xs text-slate-400 font-bold mb-1">{type}</p>
                   <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${(count / (stats?.monthBookings || 1)) * 100}%` }} />
                   </div>
                </div>
                <span className="text-sm font-black text-white pt-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderHallAnalytics = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
          <FaBuilding className="text-purple-400" />
          Event Type Distribution
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.hallEventTypesThisMonth?.map((e: any, i: number) => (
            <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black">{e.eventType}</p>
                <p className="text-lg font-bold text-white leading-none mt-1">{e.count}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FaCalendarAlt className="text-purple-400" />
              </div>
            </div>
          ))}
          {(!stats?.hallEventTypesThisMonth || stats.hallEventTypesThisMonth.length === 0) && (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              No event types recorded this month.
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <h4 className="text-sm font-bold text-white mb-6">Hall Revenue Performance</h4>
        <div className="space-y-4">
          {stats?.topHallsThisMonth?.map((h: any) => (
            <div key={h.hallId} className="flex items-center gap-4">
              <div className="flex-1">
                 <p className="text-xs text-slate-200 font-bold mb-1">{h.hallName}</p>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${(h.revenue / (stats?.hallRevenueThisMonth || 1)) * 100}%` }} />
                 </div>
              </div>
              <div className="text-right pt-4">
                <p className="text-sm font-black text-white">₹{h.revenue.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold">{h.bookingCount} bookings</p>
              </div>
            </div>
          ))}
          {(!stats?.topHallsThisMonth || stats.topHallsThisMonth.length === 0) && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No hall revenue recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
            >
              <FaArrowLeft className="text-slate-400 group-hover:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                Consolidated Analytics
              </h1>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-0.5">
                Strategic Intelligence & Performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-white/5 rounded-xl shadow-lg">
            {[
              { id: 'revenue', label: 'Revenue', icon: <FaMoneyBillWave /> },
              { id: 'bookings', label: 'Bookings', icon: <FaCalendarCheck /> },
              { id: 'halls', label: 'Convention', icon: <FaBuilding /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => router.push(`/dashboard/analytics?view=${tab.id}`)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  view === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Content */}
        {view === 'revenue' && renderRevenueAnalytics()}
        {view === 'bookings' && renderBookingAnalytics()}
        {view === 'halls' && renderHallAnalytics()}

        <footer className="pt-12 text-center border-t border-white/5">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">
            The Retinue Intelligence Engine &copy; {moment().year()}
          </p>
        </footer>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsContent />
    </Suspense>
  )
}
