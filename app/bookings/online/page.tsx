'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaDoorOpen,
  FaMoneyBillWave,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaGlobe,
  FaArrowLeft,
} from 'react-icons/fa'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { ConfirmationModal } from '@/components/ConfirmationModal'

/**
 * Online Bookings — separate page for bookings from public site (hoteltheretinueonline.in).
 * Does not merge with staff bookings; uses dedicated API GET /api/bookings/online.
 */
export default function OnlineBookingsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    bookingId: string | null
    status: string | null
    action: string | null
  }>({ show: false, bookingId: null, status: null, action: null })
  const [cancelModal, setCancelModal] = useState<{ show: boolean; bookingId: string | null }>({
    show: false,
    bookingId: null,
  })

  const queryClient = useQueryClient()

  const { data: response, isLoading } = useQuery({
    queryKey: ['bookings-online', page, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '12' })
      if (debouncedSearch) params.append('search', debouncedSearch)
      return api.get(`/bookings/online?${params.toString()}`)
    },
    staleTime: 0,
  })

  const bookings = response?.data || []
  const pagination = response?.pagination || {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  }

  const updateStatusMutation = useMutationWithInvalidation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/bookings/${id}`, { status }),
    endpoint: '/bookings/',
    onSuccess: (_: any, variables: any) => {
      setConfirmModal({ show: false, bookingId: null, status: null, action: null })
      toast.success('Booking status updated')
      queryClient.invalidateQueries({ queryKey: ['bookings-online'] })
      if (variables?.status === 'CHECKED_OUT') {
        router.push(`/bills/${variables.id}`)
      }
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update'),
  })

  const cancelBookingMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/bookings/${id}`),
    endpoint: '/bookings/',
    onSuccess: () => {
      setCancelModal({ show: false, bookingId: null })
      toast.success('Booking cancelled')
      queryClient.invalidateQueries({ queryKey: ['bookings-online'] })
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel'),
  })

  const handleStatusUpdate = (bookingId: string, status: string, action: string) => {
    setConfirmModal({ show: true, bookingId, status, action })
  }

  const confirmStatusUpdate = () => {
    if (confirmModal.bookingId && confirmModal.status) {
      updateStatusMutation.mutate({ id: confirmModal.bookingId, status: confirmModal.status })
    }
  }

  const confirmCancel = () => {
    if (cancelModal.bookingId) cancelBookingMutation.mutate(cancelModal.bookingId)
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const isCheckInToday = (b: any) => {
    const d = new Date(b.checkIn)
    return d >= todayStart && d <= todayEnd
  }
  const isCheckOutToday = (b: any) => {
    const d = new Date(b.checkOut)
    return d >= todayStart && d <= todayEnd
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header: separate from staff Bookings */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2"
            >
              <FaArrowLeft className="w-3.5 h-3.5" />
              Back to Bookings
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FaGlobe className="w-6 h-6 text-emerald-400" />
              Online Bookings
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Bookings from hoteltheretinueonline.in (public site). Manage check-in, check-out, cancel.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <SearchInput
            placeholder="Search by reference, guest, phone, room..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-400">
            Loading online bookings...
          </div>
        ) : !bookings?.length ? (
          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-12 text-center">
            <FaCalendarAlt className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-300 font-medium">No online bookings</p>
            <p className="text-sm text-slate-500 mt-1">
              Bookings from the public site will appear here.
            </p>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500"
            >
              <FaArrowLeft className="w-3 h-3" />
              View all bookings
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaCheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Confirmed</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {bookings.filter((b: any) => b.status === 'CONFIRMED').length}
                </p>
              </div>
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaDoorOpen className="w-4 h-4 text-sky-400" />
                  <span className="text-xs text-sky-400 font-medium">Checked In</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {bookings.filter((b: any) => b.status === 'CHECKED_IN').length}
                </p>
              </div>
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaClock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">Checked Out</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {bookings.filter((b: any) => b.status === 'CHECKED_OUT').length}
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FaMoneyBillWave className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Total</span>
                </div>
                <p className="text-xl font-bold text-white">
                  ₹{bookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* List */}
            <div className="rounded-xl border border-white/5 bg-slate-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-white/5">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Guest</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Room</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Check-in</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Check-out</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking: any) => {
                      const checkInToday = isCheckInToday(booking)
                      const checkOutToday = isCheckOutToday(booking)
                      const needsAction =
                        (booking.status === 'CONFIRMED' && checkInToday) ||
                        (booking.status === 'CHECKED_IN' && checkOutToday)
                      return (
                        <tr
                          key={booking.id}
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                          className={`border-b border-white/5 hover:bg-slate-700/20 cursor-pointer ${
                            needsAction ? 'bg-sky-500/5 border-l-2 border-l-sky-500' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-emerald-400">
                              {booking.bookingReference || booking.id}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-white">{booking.guest?.name}</p>
                              <p className="text-xs text-slate-500">{booking.guest?.phone}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {booking.room?.roomNumber} • {booking.room?.roomType}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {new Date(booking.checkIn).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}{' '}
                            {new Date(booking.checkIn).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-sm">
                            {new Date(booking.checkOut).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                            })}{' '}
                            {new Date(booking.checkOut).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                            ₹{booking.totalAmount?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg ${
                                booking.status === 'CONFIRMED'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : booking.status === 'CHECKED_IN'
                                    ? 'bg-sky-500/20 text-sky-400'
                                    : booking.status === 'CHECKED_OUT'
                                      ? 'bg-slate-500/20 text-slate-400'
                                      : booking.status === 'CANCELLED'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {booking.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              <Link
                                href={`/bookings/${booking.id}`}
                                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                              >
                                View
                              </Link>
                              {booking.status === 'CONFIRMED' && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleStatusUpdate(booking.id, 'CHECKED_IN', 'Check In')
                                    }
                                    className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded text-white"
                                  >
                                    Check In
                                  </button>
                                  <button
                                    onClick={() => setCancelModal({ show: true, bookingId: booking.id })}
                                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {booking.status === 'CHECKED_IN' && (
                                <button
                                  onClick={() =>
                                    handleStatusUpdate(booking.id, 'CHECKED_OUT', 'Check Out')
                                  }
                                  className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-500 rounded text-white"
                                >
                                  Check Out
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-400">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
                  >
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
                  >
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <ConfirmationModal
          show={confirmModal.show}
          title={`${confirmModal.action || 'Confirm'}?`}
          message={`Are you sure you want to ${(confirmModal.action || '').toLowerCase()} this booking?`}
          onConfirm={confirmStatusUpdate}
          onCancel={() => setConfirmModal({ show: false, bookingId: null, status: null, action: null })}
        />
        <ConfirmationModal
          show={cancelModal.show}
          title="Cancel booking?"
          message="This will cancel the booking. This action cannot be undone."
          onConfirm={confirmCancel}
          onCancel={() => setCancelModal({ show: false, bookingId: null })}
        />
      </div>
    </div>
  )
}
