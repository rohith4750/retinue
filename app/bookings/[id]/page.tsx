'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaArrowLeft, FaEdit, FaHistory, FaUser, FaHome, FaCalendarPlus, FaTimes } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { EditBookingModal } from '@/components/EditBookingModal'

export default function BookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const bookingId = params.id as string
  const [showEditModal, setShowEditModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [newCheckoutDate, setNewCheckoutDate] = useState('')

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}`),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const updateBookingMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.put(`/bookings/${bookingId}`, data),
    endpoint: '/bookings/',
    onSuccess: () => {
      setShowEditModal(false)
      toast.success('Booking updated successfully')
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update booking'
      toast.error(msg)
    },
  })

  const extendStayMutation = useMutationWithInvalidation({
    mutationFn: (data: { checkOut: string; action: string }) => api.put(`/bookings/${bookingId}`, data),
    endpoint: '/bookings/',
    onSuccess: () => {
      setShowExtendModal(false)
      setNewCheckoutDate('')
      toast.success('Stay extended successfully!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to extend stay')
    },
  })

  // Open edit modal when coming from list page with ?edit=1 (Edit button here, not only there)
  useEffect(() => {
    if (searchParams.get('edit') && booking && !isLoading) {
      setShowEditModal(true)
      router.replace(`/bookings/${bookingId}`, { scroll: false })
    }
  }, [searchParams, booking, isLoading, bookingId, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-300 text-lg">Booking not found</div>
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full max-w-4xl px-4 lg:px-6 py-4 relative z-10">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors"
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
            <div className="flex items-center space-x-2 pt-4 border-t border-white/5 flex-wrap gap-2">
              {booking.status !== 'CHECKED_OUT' && booking.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex-1 min-w-[120px] h-10 bg-slate-700 text-slate-200 font-medium text-sm rounded-lg flex items-center justify-center space-x-2"
                >
                  <FaEdit className="w-4 h-4" />
                  <span>Edit Booking</span>
                </button>
              )}
              {booking.status === 'CHECKED_IN' && (
                <button
                  onClick={() => {
                    setShowExtendModal(true)
                    const currentCheckout = new Date(booking.checkOut)
                    currentCheckout.setDate(currentCheckout.getDate() + 1)
                    const y = currentCheckout.getFullYear()
                    const m = String(currentCheckout.getMonth() + 1).padStart(2, '0')
                    const d = String(currentCheckout.getDate()).padStart(2, '0')
                    const h = String(currentCheckout.getHours()).padStart(2, '0')
                    const min = String(currentCheckout.getMinutes()).padStart(2, '0')
                    setNewCheckoutDate(`${y}-${m}-${d}T${h}:${min}`)
                  }}
                  className="flex-1 min-w-[120px] h-10 bg-amber-600 text-white font-medium text-sm rounded-lg flex items-center justify-center space-x-2 hover:bg-amber-500"
                >
                  <FaCalendarPlus className="w-4 h-4" />
                  <span>Extend Stay</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Extend Stay Modal */}
        {showExtendModal && booking && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setShowExtendModal(false); setNewCheckoutDate('') }} />
            <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="bg-amber-600 px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <FaCalendarPlus className="w-4 h-4" />
                    Extend Stay
                  </h3>
                  <p className="text-xs text-amber-100">{booking.guest?.name} • Room {booking.room?.roomNumber}</p>
                </div>
                <button onClick={() => { setShowExtendModal(false); setNewCheckoutDate('') }} className="text-white/80 hover:text-white">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-xs">Current Check-out</p>
                    <p className="text-sm font-semibold text-red-400">
                      {new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(booking.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">New Check-out Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newCheckoutDate}
                    min={new Date(booking.checkOut).toISOString().slice(0, 16)}
                    onChange={(e) => setNewCheckoutDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                {newCheckoutDate && new Date(newCheckoutDate) > new Date(booking.checkOut) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Additional Days</span>
                      <span className="text-white font-semibold">
                        {Math.ceil((new Date(newCheckoutDate).getTime() - new Date(booking.checkOut).getTime()) / (1000 * 60 * 60 * 24))} day(s)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Estimated Additional</span>
                      <span className="text-amber-400 font-semibold">
                        ₹{(Math.ceil((new Date(newCheckoutDate).getTime() - new Date(booking.checkOut).getTime()) / (1000 * 60 * 60 * 24)) * (booking.room?.basePrice || 0)).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">* Final amount will be updated on checkout</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { setShowExtendModal(false); setNewCheckoutDate('') }}
                    className="flex-1 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newCheckoutDate) { toast.error('Please select new checkout date'); return }
                      if (new Date(newCheckoutDate) <= new Date(booking.checkOut)) {
                        toast.error('New checkout must be after current checkout')
                        return
                      }
                      extendStayMutation.mutate({ checkOut: new Date(newCheckoutDate).toISOString(), action: 'EXTEND_STAY' })
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
          </div>
        )}

        {/* Edit Booking modal — same page, same fields as Add Booking */}
        {showEditModal && (
          <EditBookingModal
            booking={booking}
            onClose={() => setShowEditModal(false)}
            onSave={(data) => updateBookingMutation.mutate(data)}
            isLoading={updateBookingMutation.isPending}
          />
        )}
      </div>
    </>
  )
}
