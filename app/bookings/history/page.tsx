'use client'

import { useQuery } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaHistory, FaFilter, FaSearch, FaCalendarAlt, FaUser, FaHome, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa'

export default function BookingHistoryPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    bookingId: '',
    action: '',
    startDate: '',
    endDate: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  // Build query string
  const queryParams = new URLSearchParams()
  if (filters.bookingId) queryParams.append('bookingId', filters.bookingId)
  if (filters.action) queryParams.append('action', filters.action)
  if (filters.startDate) queryParams.append('startDate', filters.startDate)
  if (filters.endDate) queryParams.append('endDate', filters.endDate)
  queryParams.append('page', page.toString())
  queryParams.append('limit', '20')

  const { data: historyResponse, isLoading } = useQuery({
    queryKey: ['booking-history', page, filters],
    queryFn: () => api.get(`/bookings/history?${queryParams.toString()}`),
  })

  const history = historyResponse?.data || []
  const pagination = historyResponse?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1) // Reset to first page when filters change
  }

  const clearFilters = () => {
    setFilters({
      bookingId: '',
      action: '',
      startDate: '',
      endDate: '',
    })
    setPage(1)
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'UPDATED':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20'
      case 'STATUS_CHANGED':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'CANCELLED':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'CREATED', label: 'Created' },
    { value: 'UPDATED', label: 'Updated' },
    { value: 'STATUS_CHANGED', label: 'Status Changed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center h-96">
          <div className="text-slate-300 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex">
      <Navbar />
      <div className="flex-1 lg:ml-64">
        <div className="glow-sky top-20 right-20"></div>
        <div className="glow-emerald bottom-20 left-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1 flex items-center">
              <FaHistory className="mr-2 w-6 h-6" />
              Booking History
            </h1>
            <p className="text-sm text-slate-400">View all booking changes and audit trail</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center space-x-2"
          >
            <FaFilter className="w-4 h-4" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-100">Filter History</h3>
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                <FaTimes className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Booking ID</label>
                <input
                  type="text"
                  value={filters.bookingId}
                  onChange={(e) => handleFilterChange('bookingId', e.target.value)}
                  className="form-input"
                  placeholder="Enter booking ID"
                />
              </div>
              <div>
                <label className="form-label">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="form-select"
                >
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {history && history.length > 0 ? (
          <>
            <div className="space-y-3">
              {history.map((entry: any) => (
                <div
                  key={entry.id}
                  className="card group hover:scale-[1.01] transition-transform duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`badge ${getActionColor(entry.action)} text-[10px] px-2 py-1`}
                      >
                        {entry.action.replace('_', ' ')}
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">
                          Booking ID: <span className="text-slate-200 font-mono">{entry.bookingId}</span>
                        </p>
                        {entry.booking && (
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center space-x-1 text-xs">
                              <FaUser className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-300">{entry.booking.guest.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs">
                              <FaHome className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-300">
                                Room {entry.booking.room.roomNumber}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 flex items-center space-x-1">
                        <FaCalendarAlt className="w-3 h-3" />
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </p>
                      {entry.changedBy && (
                        <p className="text-xs text-slate-500 mt-1">
                          By: {entry.changedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-300">{entry.notes}</p>
                    </div>
                  )}

                  {entry.changes && Array.isArray(entry.changes) && entry.changes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Changes:</p>
                      <div className="space-y-1">
                        {entry.changes.map((change: any, index: number) => (
                          <div
                            key={index}
                            className="text-xs bg-slate-800/40 rounded p-2 border border-white/5"
                          >
                            <span className="text-slate-400 font-medium">{change.field}:</span>{' '}
                            <span className="text-red-400 line-through">
                              {change.oldValue !== null && change.oldValue !== undefined
                                ? String(change.oldValue)
                                : 'N/A'}
                            </span>{' '}
                            <span className="text-slate-300">→</span>{' '}
                            <span className="text-emerald-400">
                              {change.newValue !== null && change.newValue !== undefined
                                ? String(change.newValue)
                                : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.booking && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => router.push(`/bookings/${entry.bookingId}`)}
                        className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                      >
                        <span>View Booking Details</span>
                        <FaChevronLeft className="w-2 h-2 rotate-180" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <div className="text-xs text-slate-400">
                  Showing {((page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/5 bg-slate-800/40 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700/40 transition-colors flex items-center space-x-1"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                    <span>Previous</span>
                  </button>
                  <div className="text-xs text-slate-400 px-2">
                    Page {page} of {pagination.totalPages}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/5 bg-slate-800/40 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700/40 transition-colors flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-12">
            <div className="flex flex-col items-center">
              <FaHistory className="text-4xl mb-3 text-slate-500" />
              <p className="text-base font-semibold text-slate-300 mb-1.5">No history found</p>
              <p className="text-xs text-slate-500">
                {Object.values(filters).some((f) => f) ? 'Try adjusting your filters' : 'No booking history available yet'}
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
