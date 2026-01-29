'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaCheckCircle, FaDoorOpen, FaMoneyBillWave, FaHome, FaClock, FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaHistory, FaDownload, FaPlus, FaTimes, FaReceipt, FaPrint, FaCalendarPlus } from 'react-icons/fa'
import { useMutation } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

export default function BookingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateFilter = searchParams.get('date') || '' // e.g. YYYY-MM-DD from dashboard "Today's Bookings"
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

  const [mounted, setMounted] = useState(false)

  // Extend Stay Modal State
  const [extendModal, setExtendModal] = useState<{ show: boolean; booking: any | null }>({ show: false, booking: null })
  const [newCheckoutDate, setNewCheckoutDate] = useState('')

  useEffect(() => { setMounted(true) }, [])

  // Auth is handled by root layout

  const queryClient = useQueryClient()

  // Extend stay mutation
  const extendStayMutation = useMutation({
    mutationFn: ({ bookingId, newCheckout }: { bookingId: string; newCheckout: string }) =>
      api.put(`/bookings/${bookingId}`, { checkOut: new Date(newCheckout).toISOString(), action: 'EXTEND_STAY' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast.success('Stay extended successfully!')
      setExtendModal({ show: false, booking: null })
      setNewCheckoutDate('')
    },
    onError: (error: any) => toast.error(error?.message || 'Failed to extend stay'),
  })

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

  // Phase 2: Pagination support with search and optional date filter (today's check-ins from dashboard)
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', page, debouncedSearch, dateFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      })
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      if (dateFilter) {
        params.append('date', dateFilter)
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
    onSuccess: (updatedBooking: any, variables: any) => {
      setConfirmModal({ show: false, bookingId: null, status: null, action: null })
      toast.success('Booking status updated successfully')

      // If receptionist checked out and payment is pending, go to Bill page to collect
      if (variables?.status === 'CHECKED_OUT' && updatedBooking) {
        const balance = Math.max(0, (updatedBooking.totalAmount || 0) - (updatedBooking.paidAmount || 0))
        if (balance > 0) {
          toast(`Payment pending: ₹${balance.toLocaleString()} — Opening Bill page`, { icon: '💰' })
          router.push(`/bills/${updatedBooking.id}`)
        }
      }
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

        {/* When opened from dashboard "Today's Bookings": show filter badge and link to clear */}
        {dateFilter && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm border border-purple-500/30">
              <FaCalendarAlt className="w-3.5 h-3.5" />
              Today&apos;s check-ins — click a card to Check Out
            </span>
            <Link
              href="/bookings"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Show all bookings
            </Link>
          </div>
        )}

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

            {/* Bookings Grid - Compact Cards: click card to open full booking data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {bookings.map((booking: any) => (
                <div
                  key={booking.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/bookings/${booking.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/bookings/${booking.id}`)}
                  className={`relative overflow-hidden rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-xl cursor-pointer ${
                    booking.status === 'CONFIRMED' ? 'bg-slate-800/90 border-emerald-500/30' :
                    booking.status === 'CHECKED_IN' ? 'bg-slate-800/90 border-sky-500/30' :
                    booking.status === 'CHECKED_OUT' ? 'bg-slate-800/90 border-slate-500/30' :
                    booking.status === 'CANCELLED' ? 'bg-slate-800/90 border-red-500/30' :
                    'bg-slate-800/90 border-amber-500/30'
                  }`}
                >
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                    booking.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' :
                    booking.status === 'CHECKED_IN' ? 'bg-sky-500/20 text-sky-400' :
                    booking.status === 'CHECKED_OUT' ? 'bg-slate-500/20 text-slate-400' :
                    booking.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {booking.status.replace('_', ' ')}
                  </div>

                  <div className="p-3">
                    {/* Guest & Room Row */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                        booking.status === 'CONFIRMED' ? 'bg-emerald-500' :
                        booking.status === 'CHECKED_IN' ? 'bg-sky-500' :
                        booking.status === 'CHECKED_OUT' ? 'bg-slate-500' :
                        'bg-amber-500'
                      }`}>
                        {booking.guest.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{booking.guest.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <FaHome className="w-3 h-3" />
                          <span>{booking.room.roomNumber}</span>
                          <span className="text-slate-600">•</span>
                          <span className="truncate">{booking.room.roomType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Check-in & Check-out data on card */}
                    <div className="space-y-1.5 text-xs mb-2 p-2.5 bg-slate-900/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400 font-medium shrink-0">Check-in:</span>
                        <span className="text-slate-300">
                          {new Date(booking.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="text-slate-500 ml-1">{new Date(booking.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className={booking.flexibleCheckout ? 'text-amber-400 font-medium shrink-0' : 'text-red-400 font-medium shrink-0'}>Check-out:</span>
                        <span className="text-slate-300">
                          {new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="text-slate-500 ml-1">{new Date(booking.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {booking.flexibleCheckout && <span className="text-amber-400 text-[9px] ml-1">(TBD)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Bill */}
                    <div className="flex items-center justify-between mb-2" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <p className="text-lg font-bold text-emerald-400">₹{booking.totalAmount.toLocaleString()}</p>
                        {booking.paidAmount > 0 && booking.paidAmount < booking.totalAmount && (
                          <p className="text-[10px] text-amber-400">Paid: ₹{booking.paidAmount.toLocaleString()}</p>
                        )}
                      </div>
                      {booking.billNumber && (
                        <a
                          href={`/bills/${booking.id}`}
                          className="px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaReceipt className="w-3 h-3" />
                          Bill
                        </a>
                      )}
                    </div>

                    {/* Quick Actions - stop propagation so card click doesn't fire */}
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`/bookings/${booking.id}`}
                        className="flex-1 py-1.5 text-center text-[10px] font-medium text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
                      >
                        View
                      </a>
                      {booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                        <a
                          href={`/bookings/${booking.id}?edit=1`}
                          className="flex-1 py-1.5 text-center text-[10px] font-medium text-slate-200 bg-sky-600/50 hover:bg-sky-500/50 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <FaEdit className="w-3 h-3" />
                          Edit
                        </a>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'CHECKED_IN', 'Check In')}
                          className="flex-1 py-1.5 text-center text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                        >
                          Check In
                        </button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <>
                          <button
                            onClick={() => {
                              setExtendModal({ show: true, booking })
                              // Pre-fill with current checkout + 1 day
                              const currentCheckout = new Date(booking.checkOut)
                              currentCheckout.setDate(currentCheckout.getDate() + 1)
                              const year = currentCheckout.getFullYear()
                              const month = String(currentCheckout.getMonth() + 1).padStart(2, '0')
                              const day = String(currentCheckout.getDate()).padStart(2, '0')
                              const hours = String(currentCheckout.getHours()).padStart(2, '0')
                              const mins = String(currentCheckout.getMinutes()).padStart(2, '0')
                              setNewCheckoutDate(`${year}-${month}-${day}T${hours}:${mins}`)
                            }}
                            className="py-1.5 px-2 text-amber-400 hover:text-white hover:bg-amber-500 rounded-lg transition-colors"
                            title="Extend Stay"
                          >
                            <FaCalendarPlus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(booking.id, 'CHECKED_OUT', 'Check Out')}
                            className="flex-1 py-1.5 text-center text-[10px] font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
                          >
                            Check Out
                          </button>
                        </>
                      )}
                      {booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                        <button
                          onClick={() => setCancelModal({ show: true, bookingId: booking.id })}
                          className="py-1.5 px-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <FaTimes className="w-3 h-3" />
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

        {/* Extend Stay Modal */}
        {mounted && extendModal.show && extendModal.booking && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setExtendModal({ show: false, booking: null })} />
            <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="bg-amber-600 px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FaCalendarPlus className="w-4 h-4" />
                    Extend Stay
                  </h3>
                  <p className="text-xs text-amber-100">{extendModal.booking.guest.name} • Room {extendModal.booking.room.roomNumber}</p>
                </div>
                <button onClick={() => setExtendModal({ show: false, booking: null })} className="text-white/80 hover:text-white">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Current Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Current Check-in</p>
                    <p className="text-sm font-semibold text-white">
                      {new Date(extendModal.booking.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(extendModal.booking.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Current Check-out</p>
                    <p className="text-sm font-semibold text-red-400">
                      {new Date(extendModal.booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(extendModal.booking.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* New Checkout Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">New Check-out Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newCheckoutDate}
                    min={new Date(extendModal.booking.checkOut).toISOString().slice(0, 16)}
                    onChange={(e) => setNewCheckoutDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Price Calculation */}
                {newCheckoutDate && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Additional Days</span>
                      <span className="text-white font-semibold">
                        {Math.ceil((new Date(newCheckoutDate).getTime() - new Date(extendModal.booking.checkOut).getTime()) / (1000 * 60 * 60 * 24))} day(s)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Estimated Additional</span>
                      <span className="text-amber-400 font-semibold">
                        ₹{(Math.ceil((new Date(newCheckoutDate).getTime() - new Date(extendModal.booking.checkOut).getTime()) / (1000 * 60 * 60 * 24)) * (extendModal.booking.room?.basePrice || 0)).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">* Final amount will be calculated on checkout</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setExtendModal({ show: false, booking: null })}
                    className="flex-1 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newCheckoutDate) {
                        toast.error('Please select new checkout date')
                        return
                      }
                      if (new Date(newCheckoutDate) <= new Date(extendModal.booking.checkOut)) {
                        toast.error('New checkout must be after current checkout')
                        return
                      }
                      extendStayMutation.mutate({
                        bookingId: extendModal.booking.id,
                        newCheckout: newCheckoutDate,
                      })
                    }}
                    disabled={extendStayMutation.isPending || !newCheckoutDate}
                    className="flex-1 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2"
                  >
                    {extendStayMutation.isPending ? 'Extending...' : (
                      <>
                        <FaCalendarPlus className="w-3 h-3" />
                        Extend Stay
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  )
}

