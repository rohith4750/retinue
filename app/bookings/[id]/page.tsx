'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaArrowLeft, FaEdit, FaHistory, FaUser, FaHome, FaClock, FaMoneyBillWave } from 'react-icons/fa'
import { PageLoader } from '@/components/LoadingSpinner'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function BookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id as string
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  const queryClient = useQueryClient()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}`),
  })

  // Phase 3: Booking modification mutation
  const updateBookingMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.put(`/bookings/${bookingId}`, data),
    endpoint: '/bookings/',
    onSuccess: () => {
      setShowEditModal(false)
      toast.success('Booking updated successfully')
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update booking'
      toast.error(errorMessage)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64">
          <PageLoader />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center h-96">
          <div className="text-slate-300 text-lg">Booking not found</div>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Bookings</span>
        </button>

        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-slate-100 flex items-center">
                  <FaCalendarAlt className="mr-2 w-5 h-5" />
                  Booking Details
                </h1>
                <p className="text-sm text-slate-400 mt-1">Booking ID: {booking.id}</p>
              </div>
              <span className={`badge ${
                booking.status === 'CONFIRMED' ? 'badge-success' :
                booking.status === 'CHECKED_IN' ? 'badge-info' :
                booking.status === 'CHECKED_OUT' ? 'badge-gray' :
                booking.status === 'CANCELLED' ? 'badge-danger' :
                'badge-warning'
              }`}>
                {booking.status}
              </span>
            </div>
          </div>

          <div className="space-y-6 mt-6">
            {/* Guest Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <FaUser className="mr-2 w-4 h-4" />
                Guest Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Name</p>
                  <p className="text-sm text-slate-200">{booking.guest.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Phone</p>
                  <p className="text-sm text-slate-200">{booking.guest.phone}</p>
                </div>
                {booking.guest.address && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-400 mb-1">Address</p>
                    <p className="text-sm text-slate-200">{booking.guest.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <FaHome className="mr-2 w-4 h-4" />
                Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Room</p>
                  <p className="text-sm text-slate-200">
                    Room {booking.room.roomNumber} ({booking.room.roomType})
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Floor</p>
                  <p className="text-sm text-slate-200">Floor {booking.room.floor}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Check-in</p>
                  <p className="text-sm text-slate-200">
                    {new Date(booking.checkIn).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Check-out</p>
                  <p className="text-sm text-slate-200">
                    {new Date(booking.checkOut).toLocaleString()}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-400 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-sky-400">
                    ₹{booking.totalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 3: Booking History */}
            {booking.history && booking.history.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                  <FaHistory className="mr-2 w-4 h-4" />
                  Booking History
                </h3>
                <div className="space-y-2">
                  {booking.history.map((entry: any, index: number) => (
                    <div
                      key={entry.id || index}
                      className="bg-slate-800/40 rounded-lg p-3 border border-white/5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{entry.action}</p>
                          {entry.notes && (
                            <p className="text-xs text-slate-400 mt-1">{entry.notes}</p>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-4 border-t border-white/5">
              {booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <FaEdit className="w-4 h-4" />
                  <span>Edit Booking</span>
                </button>
              )}
              {booking.bill && (
                <a
                  href={`/bills/${booking.bill.id}`}
                  className="btn-primary flex items-center space-x-2"
                >
                  <FaMoneyBillWave className="w-4 h-4" />
                  <span>View Bill</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Phase 3: Edit Booking Modal */}
        {showEditModal && (
          <EditBookingModal
            booking={booking}
            onClose={() => setShowEditModal(false)}
            onSave={(data) => updateBookingMutation.mutate(data)}
            isLoading={updateBookingMutation.isPending}
          />
        )}
        </div>
      </div>
    </div>
  )
}

// Phase 3: Edit Booking Modal Component
function EditBookingModal({
  booking,
  onClose,
  onSave,
  isLoading,
}: {
  booking: any
  onClose: () => void
  onSave: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    checkIn: new Date(booking.checkIn).toISOString().slice(0, 16),
    checkOut: new Date(booking.checkOut).toISOString().slice(0, 16),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate dates
    const checkInDate = new Date(formData.checkIn)
    const checkOutDate = new Date(formData.checkOut)
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      toast.error('Please enter valid dates')
      return
    }
    
    onSave({
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 relative z-10">
          <div className="card-header">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <FaEdit className="mr-2 w-4 h-4" />
              Edit Booking
            </h2>
            <p className="text-xs text-slate-400 mt-1">Update booking dates</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="form-label">Check-in Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Check-out Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-white/5 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm px-4 py-2"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-sm px-4 py-2"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
