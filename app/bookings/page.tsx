'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaCheckCircle, FaDoorOpen, FaMoneyBillWave, FaUser, FaHome, FaClock, FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaHistory, FaDownload, FaPlus } from 'react-icons/fa'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

export default function BookingsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    bookingId: string | null
    status: string | null
    action: string | null
  }>({
    show: false,
    bookingId: null,
    status: null,
    action: null,
  })
  const [cancelModal, setCancelModal] = useState<{
    show: boolean
    bookingId: string | null
  }>({
    show: false,
    bookingId: null,
  })
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean
    bookingId: string | null
  }>({
    show: false,
    bookingId: null,
  })

  // Auth is handled by root layout

  const queryClient = useQueryClient()

  // Keyboard shortcut: Ctrl+K for search
  useKeyboardShortcut({
    ctrl: true,
    key: 'k',
    callback: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
      searchInput?.focus()
    },
  })

  // Keyboard shortcut: Ctrl+N for new booking
  useKeyboardShortcut({
    ctrl: true,
    key: 'n',
    callback: () => router.push('/bookings/new'),
  })

  // Phase 2: Pagination support with search
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      })
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      return api.get(`/bookings?${params.toString()}`)
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always', // Refetch when component mounts
  })

  // Handle new API response format: { data: [...], pagination: {...} }
  const bookings = Array.isArray(bookingsResponse) 
    ? bookingsResponse 
    : (bookingsResponse?.data || [])
  const pagination = bookingsResponse?.pagination || { 
    page: 1, 
    limit: 12, 
    total: Array.isArray(bookingsResponse) ? bookingsResponse.length : (bookingsResponse?.data?.length || 0), 
    totalPages: 1 
  }

  const updateStatusMutation = useMutationWithInvalidation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/bookings/${id}`, { status }),
    endpoint: '/bookings/', // Automatically invalidates: bookings, rooms, available-rooms, dashboard
    onSuccess: () => {
      setConfirmModal({ show: false, bookingId: null, status: null, action: null })
      toast.success('Booking status updated successfully')
    },
    onError: (error: any) => {
      // Phase 2: Better error handling
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update booking status'
      toast.error(errorMessage)
    },
  })

  // Phase 3: Booking cancellation
  const cancelBookingMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/bookings/${id}`),
    endpoint: '/bookings/',
    onSuccess: () => {
      setCancelModal({ show: false, bookingId: null })
      toast.success('Booking cancelled successfully')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to cancel booking'
      toast.error(errorMessage)
    },
  })

  // Permanent delete booking (Admin only)
  const deleteBookingMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/bookings/${id}?permanent=true`),
    endpoint: '/bookings/',
    onSuccess: () => {
      setDeleteModal({ show: false, bookingId: null })
      toast.success('Booking deleted permanently')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete booking'
      toast.error(errorMessage)
    },
  })

  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) {
      toast.error('No bookings to export')
      return
    }

    // Create CSV content
    const headers = ['Booking ID', 'Guest Name', 'Phone', 'Room', 'Check-in', 'Check-out', 'Status', 'Amount']
    const rows: string[][] = bookings.map((booking: any) => [
      booking.bookingId || booking.id,
      booking.guest.name,
      booking.guest.phone,
      `Room ${booking.room.roomNumber}`,
      new Date(booking.checkIn).toLocaleDateString(),
      new Date(booking.checkOut).toLocaleDateString(),
      booking.status,
      `₹${booking.totalAmount.toLocaleString()}`,
    ])

    const csvRows: string[] = rows.map((row: string[]) => 
      row.map((cell: string) => `"${cell}"`).join(',')
    )

    const csvContent = [
      headers.join(','),
      ...csvRows,
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Bookings exported successfully')
  }

  const handleStatusUpdate = (bookingId: string, status: string, action: string) => {
    setConfirmModal({ show: true, bookingId, status, action })
  }

  const confirmStatusUpdate = () => {
    if (confirmModal.bookingId && confirmModal.status) {
      updateStatusMutation.mutate({
        id: confirmModal.bookingId,
        status: confirmModal.status,
      })
    }
  }


  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-6 w-32 bg-slate-700/50 rounded animate-pulse mb-4" />
              <div className="space-y-2 mb-4">
                <div className="h-3 w-full bg-slate-700/50 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-slate-700/50 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-700/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header: Search/Export on left, History/New Booking on right */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Left: Search and Export */}
          <div className="flex items-center gap-3">
            <SearchInput
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-48"
            />
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800/60 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors border border-white/5"
              title="Export to CSV"
            >
              <FaDownload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Right: History and New Booking */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/bookings/history')}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <FaHistory className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <Link
              href="/bookings/new"
              className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              <span>New Booking</span>
            </Link>
          </div>
        </div>

        {bookings && bookings.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Confirmed</span>
                </div>
                <p className="text-2xl font-bold text-white">{bookings.filter((b: any) => b.status === 'CONFIRMED').length}</p>
              </div>
              <div className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 border border-sky-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaDoorOpen className="w-4 h-4 text-sky-400" />
                  <span className="text-xs text-sky-400 font-medium">Checked In</span>
                </div>
                <p className="text-2xl font-bold text-white">{bookings.filter((b: any) => b.status === 'CHECKED_IN').length}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 border border-slate-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaClock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Checked Out</span>
                </div>
                <p className="text-2xl font-bold text-white">{bookings.filter((b: any) => b.status === 'CHECKED_OUT').length}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaMoneyBillWave className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Total Revenue</span>
                </div>
                <p className="text-xl font-bold text-white">₹{bookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Bookings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {bookings.map((booking: any) => (
                <div
                  key={booking.id}
                  className={`relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                    booking.status === 'CONFIRMED' ? 'bg-gradient-to-br from-slate-800/80 to-emerald-900/20 border-emerald-500/20 hover:border-emerald-500/40' :
                    booking.status === 'CHECKED_IN' ? 'bg-gradient-to-br from-slate-800/80 to-sky-900/20 border-sky-500/20 hover:border-sky-500/40' :
                    booking.status === 'CHECKED_OUT' ? 'bg-gradient-to-br from-slate-800/80 to-slate-700/20 border-slate-500/20 hover:border-slate-500/40' :
                    booking.status === 'CANCELLED' ? 'bg-gradient-to-br from-slate-800/80 to-red-900/20 border-red-500/20 hover:border-red-500/40' :
                    'bg-gradient-to-br from-slate-800/80 to-amber-900/20 border-amber-500/20 hover:border-amber-500/40'
                  }`}
                >
                  {/* Status Ribbon */}
                  <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl ${
                    booking.status === 'CONFIRMED' ? 'bg-emerald-500 text-white' :
                    booking.status === 'CHECKED_IN' ? 'bg-sky-500 text-white' :
                    booking.status === 'CHECKED_OUT' ? 'bg-slate-500 text-white' :
                    booking.status === 'CANCELLED' ? 'bg-red-500 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {booking.status.replace('_', ' ')}
                  </div>

                  <div className="p-5">
                    {/* Guest Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                        booking.status === 'CONFIRMED' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' :
                        booking.status === 'CHECKED_IN' ? 'bg-gradient-to-br from-sky-400 to-sky-600' :
                        booking.status === 'CHECKED_OUT' ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                        'bg-gradient-to-br from-amber-400 to-amber-600'
                      }`}>
                        {booking.guest.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{booking.guest.name}</h3>
                        <p className="text-sm text-slate-400">{booking.guest.phone}</p>
                        <p className="text-xs text-slate-500 font-mono">#{booking.bookingId || booking.id.slice(0, 8)}</p>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="space-y-3 mb-4">
                      {/* Room */}
                      <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          booking.status === 'CHECKED_IN' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          <FaHome className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Room</p>
                          <p className="text-base font-semibold text-white">{booking.room.roomNumber} <span className="text-sm font-normal text-slate-400">• {booking.room.roomType}</span></p>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-slate-900/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <FaCalendarAlt className="w-3 h-3 text-emerald-400" />
                            <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">Check-in</p>
                          </div>
                          <p className="text-sm font-semibold text-white">{new Date(booking.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                          <p className="text-xs text-slate-500">{new Date(booking.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="p-3 bg-slate-900/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <FaCalendarAlt className="w-3 h-3 text-red-400" />
                            <p className="text-[10px] text-red-400 uppercase tracking-wider font-medium">Check-out</p>
                          </div>
                          <p className="text-sm font-semibold text-white">{new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                          <p className="text-xs text-slate-500">{new Date(booking.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-xl border border-emerald-500/20">
                        <div>
                          <p className="text-xs text-slate-400">Total Amount</p>
                          <p className="text-2xl font-bold text-emerald-400">₹{booking.totalAmount.toLocaleString()}</p>
                        </div>
                        {booking.billNumber && (
                          <a
                            href={`/bills/${booking.id}`}
                            className="px-4 py-2 text-xs font-semibold text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl transition-colors flex items-center gap-2"
                          >
                            <FaMoneyBillWave className="w-4 h-4" />
                            Bill
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-white/5">
                      <a
                        href={`/bookings/${booking.id}`}
                        className="flex-1 py-2.5 text-center text-sm font-medium text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <FaEdit className="w-4 h-4" />
                        View
                      </a>
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'CHECKED_IN', 'Check In')}
                          className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                        >
                          <FaCheckCircle className="w-4 h-4" />
                          Check In
                        </button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'CHECKED_OUT', 'Check Out')}
                          className="flex-1 py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 rounded-xl transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
                        >
                          <FaDoorOpen className="w-4 h-4" />
                          Check Out
                        </button>
                      )}
                      {booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                        <button
                          onClick={() => setCancelModal({ show: true, bookingId: booking.id })}
                          className="py-2.5 px-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors"
                          title="Cancel"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                      {booking.status === 'CHECKED_OUT' && (
                        <button
                          onClick={() => setDeleteModal({ show: true, bookingId: booking.id })}
                          className="py-2.5 px-3 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Phase 2: Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <div className="text-xs text-slate-400">
                  Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} bookings
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
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
              <FaCalendarAlt className="text-4xl mb-3 text-slate-500" />
              <p className="text-base font-semibold text-slate-300 mb-1.5">No bookings found</p>
              <p className="text-xs text-slate-500 mb-4">Click "New Booking" to create your first booking</p>
              <button
                onClick={() => router.push('/bookings/new')}
                className="btn-primary text-sm px-4 py-2"
              >
                <span>Create Your First Booking</span>
              </button>
            </div>
          </div>
        )}

        <ConfirmationModal
          show={confirmModal.show}
          title={`Confirm ${confirmModal.action || ''}`}
          message={`Are you sure you want to ${(confirmModal.action || '').toLowerCase()} this booking?`}
          action={confirmModal.action || ''}
          type="update"
          onConfirm={confirmStatusUpdate}
          onCancel={() => setConfirmModal({ show: false, bookingId: null, status: null, action: null })}
          isLoading={updateStatusMutation.isPending}
        />

        {/* Phase 3: Cancel Booking Modal */}
        <ConfirmationModal
          show={cancelModal.show}
          title="Cancel Booking"
          message="Are you sure you want to cancel this booking? This action cannot be undone and the room will be made available again."
          action="Cancel"
          type="delete"
          onConfirm={() => {
            if (cancelModal.bookingId) {
              cancelBookingMutation.mutate(cancelModal.bookingId)
            }
          }}
          onCancel={() => setCancelModal({ show: false, bookingId: null })}
          isLoading={cancelBookingMutation.isPending}
          confirmText="Cancel Booking"
        />

        {/* Delete Booking Modal (Permanent) */}
        <ConfirmationModal
          show={deleteModal.show}
          title="Delete Booking"
          message="Are you sure you want to permanently delete this booking? This will remove all booking records including history and bills. This action cannot be undone."
          action="Delete"
          type="delete"
          onConfirm={() => {
            if (deleteModal.bookingId) {
              deleteBookingMutation.mutate(deleteModal.bookingId)
            }
          }}
          onCancel={() => setDeleteModal({ show: false, bookingId: null })}
          isLoading={deleteBookingMutation.isPending}
          confirmText="Delete Permanently"
        />
      </div>
    </>
  )
}

