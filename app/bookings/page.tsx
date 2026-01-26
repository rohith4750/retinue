'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaCheckCircle, FaDoorOpen, FaMoneyBillWave, FaUser, FaHome, FaClock, FaEdit, FaTrash, FaChevronLeft, FaChevronRight, FaHistory } from 'react-icons/fa'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'

export default function BookingsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
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

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  const queryClient = useQueryClient()

  // Phase 2: Pagination support
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', page],
    queryFn: () => api.get(`/bookings?page=${page}&limit=12`),
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
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Bookings</h1>
            <p className="text-sm text-slate-400">Manage guest bookings and reservations</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/bookings/history')}
              className="btn-secondary flex items-center space-x-2"
            >
              <FaHistory className="w-4 h-4" />
              <span>View History</span>
            </button>
            <button
              onClick={() => router.push('/bookings/new')}
              className="btn-primary flex items-center space-x-2"
            >
              <FaCalendarAlt className="w-4 h-4" />
              <span>New Booking</span>
            </button>
          </div>
        </div>

        {bookings && bookings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookings.map((booking: any) => (
              <div
                key={booking.id}
                className="card group hover:scale-105 transition-transform duration-200"
              >
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaCalendarAlt className="w-4 h-4 text-sky-400 flex-shrink-0" />
                      <h3 className="text-base font-bold text-slate-100 truncate">
                        {booking.guest.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <FaUser className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-400">{booking.guest.phone}</span>
                    </div>
                  </div>
                  <span className={`badge ${
                    booking.status === 'CONFIRMED' ? 'badge-success' :
                    booking.status === 'CHECKED_IN' ? 'badge-info' :
                    booking.status === 'CHECKED_OUT' ? 'badge-gray' :
                    booking.status === 'CANCELLED' ? 'badge-danger' :
                    'badge-warning'
                  } text-[10px] px-2 py-0.5 ml-2 flex-shrink-0`}>
                    {booking.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 relative z-10">
                  <div className="flex items-center space-x-2 text-xs">
                    <FaHome className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">Room</span>
                    <span className="text-slate-200 font-semibold">
                      {booking.room.roomNumber} ({booking.room.roomType})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs whitespace-nowrap">
                    <FaClock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-400">Check-in:</span>
                    <span className="text-slate-200 font-medium">
                      {new Date(booking.checkIn).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs whitespace-nowrap">
                    <FaClock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-400">Check-out:</span>
                    <span className="text-slate-200 font-medium">
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-slate-400 text-xs">Total Amount</span>
                    <span className="text-lg font-bold text-sky-400">
                      ₹{booking.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 relative z-10">
                  <a
                    href={`/bookings/${booking.id}`}
                    className="text-sky-400 hover:text-sky-300 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors border border-sky-500/20 flex items-center justify-center space-x-1 whitespace-nowrap"
                  >
                    <FaEdit className="w-3 h-3 flex-shrink-0" />
                    <span>View</span>
                  </a>
                  {booking.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'CHECKED_IN', 'Check In')}
                      className="text-sky-400 hover:text-sky-300 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors border border-sky-500/20 flex items-center justify-center space-x-1 whitespace-nowrap"
                    >
                      <FaCheckCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Check In</span>
                    </button>
                  )}
                  {booking.status === 'CHECKED_IN' && (
                    <button
                      onClick={() => handleStatusUpdate(booking.id, 'CHECKED_OUT', 'Check Out')}
                      className="text-sky-400 hover:text-sky-300 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors border border-sky-500/20 flex items-center justify-center space-x-1 whitespace-nowrap"
                    >
                      <FaDoorOpen className="w-3 h-3 flex-shrink-0" />
                      <span>Check Out</span>
                    </button>
                  )}
                  {booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                    <button
                      onClick={() => setCancelModal({ show: true, bookingId: booking.id })}
                      className="text-red-400 hover:text-red-300 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-red-500/20 flex items-center justify-center space-x-1 whitespace-nowrap"
                    >
                      <FaTrash className="w-3 h-3 flex-shrink-0" />
                      <span>Cancel</span>
                    </button>
                  )}
                  {booking.bill && (
                    <a
                      href={`/bills/${booking.bill.id}`}
                      className="text-emerald-400 hover:text-emerald-300 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors border border-emerald-500/20 flex items-center justify-center space-x-1 whitespace-nowrap"
                    >
                      <FaMoneyBillWave className="w-3 h-3 flex-shrink-0" />
                      <span>Bill</span>
                    </a>
                  )}
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
        </div>
      </div>
    </div>
  )
}

