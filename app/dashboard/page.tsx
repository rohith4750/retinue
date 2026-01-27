'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { FaHome, FaCheckCircle, FaCalendarAlt, FaDollarSign, FaExclamationTriangle, FaBox } from 'react-icons/fa'

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard'),
  })

  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-800/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
              <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse mb-3" />
              <div className="h-10 w-32 bg-slate-700/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Rooms',
      value: stats?.totalRooms || 0,
      color: 'bg-blue-500',
      icon: FaHome,
    },
    {
      title: 'Available Rooms',
      value: stats?.availableRooms || 0,
      color: 'bg-green-500',
      icon: FaCheckCircle,
    },
    {
      title: "Today's Bookings",
      value: stats?.todayBookings || 0,
      color: 'bg-purple-500',
      icon: FaCalendarAlt,
    },
    {
      title: "Today's Revenue",
      value: `₹${(stats?.todayRevenue || 0).toLocaleString()}`,
      color: 'bg-yellow-500',
      icon: FaDollarSign,
    },
    {
      title: 'Pending Payments',
      value: `₹${(stats?.pendingPayments || 0).toLocaleString()}`,
      color: 'bg-red-500',
      icon: FaExclamationTriangle,
    },
    {
      title: 'Low Stock Alerts',
      value: stats?.lowStockAlerts || 0,
      color: 'bg-orange-500',
      icon: FaBox,
    },
  ]

  const colorClasses: Record<string, string> = {
    'bg-blue-500': 'bg-sky-600/30 backdrop-blur-xl border border-sky-500/20',
    'bg-green-500': 'bg-emerald-500/30 backdrop-blur-xl border border-emerald-500/20',
    'bg-purple-500': 'bg-fuchsia-600/30 backdrop-blur-xl border border-fuchsia-500/20',
    'bg-yellow-500': 'bg-yellow-500/30 backdrop-blur-xl border border-yellow-500/20',
    'bg-red-500': 'bg-red-600/30 backdrop-blur-xl border border-red-500/20',
    'bg-orange-500': 'bg-orange-500/30 backdrop-blur-xl border border-orange-500/20',
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`${colorClasses[card.color] || 'bg-slate-900/60 backdrop-blur-xl border border-white/5'} rounded-2xl shadow-[0_18px_60px_rgba(15,23,42,0.9)] p-4 text-slate-100 transform transition-all duration-200 hover:scale-105 hover:shadow-[0_25px_80px_rgba(15,23,42,0.95)] relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl"></div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider">{card.title}</p>
                  <p className="text-4xl font-bold mt-3 text-slate-50">{card.value}</p>
                </div>
                <card.icon className="text-6xl opacity-80" />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-bold text-slate-100">Recent Bookings</h2>
            <p className="text-xs text-slate-400 mt-1">Latest booking activities</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check-in</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentBookings?.map((booking: any) => (
                  <tr key={booking.id}>
                    <td className="font-semibold text-slate-100">{booking.guest.name}</td>
                    <td>
                      <span className="badge badge-info">Room {booking.room.roomNumber}</span>
                    </td>
                    <td className="text-slate-300">{new Date(booking.checkIn).toLocaleDateString()}</td>
                    <td className="font-semibold text-slate-100">₹{booking.totalAmount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${
                        booking.status === 'CONFIRMED' ? 'badge-success' :
                        booking.status === 'CHECKED_OUT' ? 'badge-gray' :
                        'badge-warning'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentBookings || stats.recentBookings.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center">
                        <FaCalendarAlt className="text-4xl mb-2 text-slate-500" />
                        <p className="text-slate-300">No recent bookings</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
