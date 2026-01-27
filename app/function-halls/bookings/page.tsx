'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaCalendarAlt, FaUser, FaPhone, FaBuilding, FaChevronLeft, FaChevronRight, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import Link from 'next/link'

export default function FunctionHallBookingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [page, setPage] = useState(1)
  const [cancelModal, setCancelModal] = useState<{ show: boolean; bookingId: string | null }>({
    show: false,
    bookingId: null
  })
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; bookingId: string | null }>({
    show: false,
    bookingId: null
  })

  // Fetch bookings
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['function-hall-bookings', debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      return api.get(`/function-hall-bookings?${params.toString()}`)
    }
  })

  const bookings = bookingsData?.data || []
  const pagination = bookingsData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }

  // Cancel mutation
  const cancelMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/function-hall-bookings/${id}`),
    endpoint: '/function-hall-bookings',
    onSuccess: () => {
      setCancelModal({ show: false, bookingId: null })
      toast.success('Booking cancelled successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cancel booking')
    }
  })

  // Delete mutation (permanent)
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/function-hall-bookings/${id}?permanent=true`),
    endpoint: '/function-hall-bookings',
    onSuccess: () => {
      setDeleteModal({ show: false, bookingId: null })
      toast.success('Booking deleted permanently')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete booking')
    }
  })

  // Complete mutation
  const completeMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.put(`/function-hall-bookings/${id}`, { status: 'COMPLETED' }),
    endpoint: '/function-hall-bookings',
    onSuccess: () => {
      toast.success('Booking marked as completed')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update booking')
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'COMPLETED': return 'bg-slate-500/20 text-slate-400 border-slate-500'
      case 'CANCELLED': return 'bg-red-500/20 text-red-400 border-red-500'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500'
    }
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/function-halls"
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <FaBuilding className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Halls</span>
            </Link>
            <SearchInput
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-48"
            />
          </div>

          <Link
            href="/function-halls/bookings/new"
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            <span>New Booking</span>
          </Link>
        </div>

        {/* Bookings List */}
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking: any) => (
              <div
                key={booking.id}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left: Booking Info */}
                  <div className="flex-1 min-w-[250px]">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {booking.eventType}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{booking.customerName}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <FaPhone className="w-3 h-3" />
                        {booking.customerPhone}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaBuilding className="w-3 h-3" />
                        {booking.hall?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaUser className="w-3 h-3" />
                        {booking.expectedGuests} guests
                      </span>
                    </div>
                  </div>

                  {/* Center: Date & Time */}
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-sky-400 mb-1">
                      <FaCalendarAlt className="w-4 h-4" />
                      <span className="font-semibold">
                        {new Date(booking.eventDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-white mb-1">
                      ₹{booking.totalAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Advance: ₹{booking.advanceAmount.toLocaleString()} | 
                      Balance: <span className="text-amber-400">₹{booking.balanceAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {booking.status === 'CONFIRMED' && (
                        <button
                          onClick={() => completeMutation.mutate(booking.id)}
                          className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                          title="Mark Complete"
                        >
                          <FaCheck className="w-4 h-4" />
                        </button>
                      )}
                      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <button
                          onClick={() => setCancelModal({ show: true, bookingId: booking.id })}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <FaTimes className="w-4 h-4" />
                        </button>
                      )}
                      {booking.status === 'COMPLETED' && (
                        <button
                          onClick={() => setDeleteModal({ show: true, bookingId: booking.id })}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {booking.specialRequests && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="text-xs text-slate-500">Special Requests: </span>
                    <span className="text-xs text-slate-300">{booking.specialRequests}</span>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
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
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="flex flex-col items-center">
              <FaCalendarAlt className="text-4xl mb-3 text-slate-500" />
              <p className="text-base font-semibold text-slate-300 mb-1.5">No bookings found</p>
              <p className="text-xs text-slate-500 mb-4">Click "New Booking" to create your first function hall booking</p>
              <Link
                href="/function-halls/bookings/new"
                className="btn-primary text-sm px-4 py-2"
              >
                Create Your First Booking
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        show={cancelModal.show}
        title="Cancel Booking"
        message="Are you sure you want to cancel this booking? The hall will become available again."
        action="Cancel"
        type="delete"
        onConfirm={() => {
          if (cancelModal.bookingId) {
            cancelMutation.mutate(cancelModal.bookingId)
          }
        }}
        onCancel={() => setCancelModal({ show: false, bookingId: null })}
        isLoading={cancelMutation.isPending}
        confirmText="Cancel Booking"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Delete Booking"
        message="Are you sure you want to permanently delete this booking? This action cannot be undone."
        action="Delete"
        type="delete"
        onConfirm={() => {
          if (deleteModal.bookingId) {
            deleteMutation.mutate(deleteModal.bookingId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, bookingId: null })}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Permanently"
      />
    </>
  )
}
