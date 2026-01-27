'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState } from 'react'
import Link from 'next/link'
import { FaHistory, FaFilter, FaCalendarAlt, FaUser, FaHome, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function BookingHistoryPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    bookingId: '',
    action: '',
    startDate: '',
    endDate: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Auth is handled by root layout

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
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-400">View all booking changes and audit trail</p>
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

        {/* History Table */}
        {history && history.length > 0 ? (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Booking ID</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Changes</th>
                    <th>Date & Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry: any) => (
                    <tr key={entry.id}>
                      <td>
                        <span className={`badge ${getActionColor(entry.action)} text-[10px] px-2 py-1`}>
                          {entry.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="text-slate-200 font-mono text-xs">{entry.bookingId}</span>
                      </td>
                      <td>
                        {entry.booking ? (
                          <div className="flex items-center space-x-1">
                            <FaUser className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-300">{entry.booking.guest.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td>
                        {entry.booking ? (
                          <div className="flex items-center space-x-1">
                            <FaHome className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-300">{entry.booking.room.roomType} {entry.booking.room.roomNumber}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td>
                        {entry.changes && Array.isArray(entry.changes) && entry.changes.length > 0 ? (
                          <div className="space-y-1 max-w-xs">
                            {entry.changes.map((change: any, index: number) => (
                              <div key={index} className="text-xs">
                                <span className="text-slate-400">{change.field}:</span>{' '}
                                <span className="text-red-400">{change.oldValue || 'N/A'}</span>
                                <span className="text-slate-500"> → </span>
                                <span className="text-emerald-400">{change.newValue || 'N/A'}</span>
                              </div>
                            ))}
                          </div>
                        ) : entry.notes ? (
                          <span className="text-xs text-slate-400">{entry.notes}</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td>
                        <div className="text-xs text-slate-400">
                          {new Date(entry.timestamp).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                          <br />
                          <span className="text-slate-500">
                            {new Date(entry.timestamp).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>
                      <td>
                        {entry.booking && (
                          <Link
                            href={`/bookings/${entry.bookingId}`}
                            className="text-xs text-sky-400 hover:text-sky-300 whitespace-nowrap"
                          >
                            View Details →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination inside card */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
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
          </div>
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
    </>
  )
}
