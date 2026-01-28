'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState } from 'react'
import Link from 'next/link'
import { FaHistory, FaFilter, FaCalendarAlt, FaUser, FaHome, FaChevronLeft, FaChevronRight, FaTimes } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function toTitleCase(input: string) {
  return input
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDateTime(value: any) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function isLikelyDateString(v: any) {
  if (typeof v !== 'string') return false
  // ISO or date-ish strings
  return /\d{4}-\d{2}-\d{2}/.test(v) || v.includes('T') || v.endsWith('Z')
}

function formatValue(v: any) {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number') return Number.isFinite(v) ? v.toLocaleString('en-IN') : String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (v instanceof Date) return formatDateTime(v)
  if (typeof v === 'string' && isLikelyDateString(v)) return formatDateTime(v)
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

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
    staleTime: 0,
    refetchOnMount: 'always',
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
      case 'STAY_EXTENDED':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'PAYMENT_RECEIVED':
        return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
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
    { value: 'STAY_EXTENDED', label: 'Stay Extended' },
    { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FaHistory className="text-sky-400" />
              Booking History
            </h1>
            <p className="text-sm text-slate-400 mt-1">Audit trail of booking updates, payments, and actions</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400">
              Total: <span className="text-white font-semibold">{pagination.total || 0}</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 rounded-xl border border-white/5 bg-slate-900/60 text-slate-200 text-sm font-medium hover:bg-slate-800/60 transition-colors flex items-center gap-2"
            >
              <FaFilter className="w-4 h-4 text-slate-400" />
              {showFilters ? 'Hide Filters' : 'Filters'}
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <FaTimes className="w-3 h-3" />
                Clear
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

        {/* History Timeline */}
        {history && history.length > 0 ? (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-slate-400" />
                <p className="text-sm font-semibold text-white">Latest activity</p>
              </div>
              <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                {history.map((entry: any, idx: number) => {
                  const hasBooking = !!entry.booking
                  const guestName = entry.booking?.guest?.name || 'Guest'
                  const roomLabel = entry.booking?.room ? `${entry.booking.room.roomType} ${entry.booking.room.roomNumber}` : '—'
                  const actionLabel = toTitleCase(entry.action || 'UPDATED')
                  const changes = Array.isArray(entry.changes) ? entry.changes : []
                  const showChanges = changes.length > 0
                  const ts = formatDateTime(entry.timestamp)

                  return (
                    <div key={entry.id} className="relative">
                      {/* timeline line */}
                      <div className="absolute left-3 top-0 bottom-0 w-px bg-white/5" />
                      {/* dot */}
                      <div className="absolute left-[6px] top-5 w-4 h-4 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${entry.action === 'CANCELLED' ? 'bg-red-500' : entry.action === 'PAYMENT_RECEIVED' ? 'bg-emerald-500' : entry.action === 'STAY_EXTENDED' ? 'bg-amber-500' : entry.action === 'CREATED' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                      </div>

                      <div className="pl-10">
                        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-4 hover:bg-slate-800/60 transition-colors">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-semibold tracking-wide ${getActionColor(entry.action)}`}>
                                  {actionLabel}
                                </span>
                                <span className="text-xs text-slate-500">•</span>
                                <span className="text-xs text-slate-400">{ts}</span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5 text-sm">
                                  <span className="text-slate-500 font-mono text-xs">{entry.bookingId}</span>
                                  {hasBooking && (
                                    <Link href={`/bookings/${entry.bookingId}`} className="text-xs text-sky-400 hover:text-sky-300">
                                      View →
                                    </Link>
                                  )}
                                </div>
                                <span className="text-xs text-slate-600">|</span>
                                <div className="flex items-center gap-1.5 text-sm text-slate-300 min-w-0">
                                  <FaUser className="w-3 h-3 text-slate-500" />
                                  <span className="truncate">{guestName}</span>
                                </div>
                                <span className="text-xs text-slate-600">|</span>
                                <div className="flex items-center gap-1.5 text-sm text-slate-300 min-w-0">
                                  <FaHome className="w-3 h-3 text-slate-500" />
                                  <span className="truncate">{roomLabel}</span>
                                </div>
                              </div>
                            </div>

                            {/* quick note */}
                            {entry.notes && (
                              <div className="md:max-w-sm text-xs text-slate-300 bg-slate-900/40 border border-white/5 rounded-xl p-3">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Note</p>
                                <p className="leading-relaxed">{entry.notes}</p>
                              </div>
                            )}
                          </div>

                          {/* changes */}
                          {showChanges && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Changes</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {changes.slice(0, 6).map((c: any, i: number) => (
                                  <div key={i} className="flex items-start justify-between gap-3 bg-slate-900/30 border border-white/5 rounded-xl p-3">
                                    <div className="min-w-0">
                                      <p className="text-xs text-slate-400">{toTitleCase(c.field || 'Field')}</p>
                                      {c.note && <p className="text-[10px] text-slate-500 mt-0.5">{c.note}</p>}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[11px] text-red-300 font-mono truncate max-w-[180px]">{formatValue(c.oldValue)}</p>
                                      <p className="text-[10px] text-slate-600">→</p>
                                      <p className="text-[11px] text-emerald-300 font-mono truncate max-w-[180px]">{formatValue(c.newValue)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {changes.length > 6 && (
                                <p className="text-[10px] text-slate-500 mt-2">+{changes.length - 6} more change(s)</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pagination inside card */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 pb-4 border-t border-white/5">
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
