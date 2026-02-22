'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaCalendarAlt, FaClock, FaUsers, FaRupeeSign, FaArrowLeft } from 'react-icons/fa'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function NewFunctionHallBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedHallId = searchParams.get('hallId')
  const preselectedDate = searchParams.get('date')

  const [formData, setFormData] = useState({
    hallId: preselectedHallId || '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    eventType: '',
    eventDate: preselectedDate || '',
    startTime: '09:00',
    endTime: '21:00',
    expectedGuests: '',
    totalAmount: '',
    advanceAmount: '0',
    specialRequests: ''
  })

  const [selectedHall, setSelectedHall] = useState<any>(null)

  // Fetch available halls
  const { data: hallsData } = useQuery({
    queryKey: ['function-halls-available', formData.eventDate],
    queryFn: () => {
      if (formData.eventDate) {
        return api.get(`/function-halls/available?date=${encodeURIComponent(formData.eventDate)}`)
      }
      return api.get('/function-halls')
    }
  })

  const halls = hallsData?.halls || hallsData || []

  // Update selected hall when hallId changes
  useEffect(() => {
    if (formData.hallId && halls.length > 0) {
      const hall = halls.find((h: any) => h.id === formData.hallId)
      setSelectedHall(hall)
      if (hall && !formData.totalAmount) {
        setFormData(prev => ({ ...prev, totalAmount: hall.pricePerDay.toString() }))
      }
    }
  }, [formData.hallId, halls])

  // Create booking mutation
  const createMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.post('/function-hall-bookings', data),
    endpoint: '/function-hall-bookings',
    onSuccess: () => {
      toast.success('Booking created successfully!')
      router.push('/function-halls/bookings')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create booking')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.hallId) {
      toast.error('Please select a function hall')
      return
    }
    if (!formData.eventDate) {
      toast.error('Please select an event date')
      return
    }
    if (parseInt(formData.expectedGuests) > (selectedHall?.capacity || 0)) {
      toast.error(`Hall capacity is ${selectedHall?.capacity} guests`)
      return
    }

    createMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === 'customerPhone') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 10)
      setFormData(prev => ({ ...prev, [name]: cleanValue }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const eventTypes = [
    'Wedding',
    'Birthday Party',
    'Corporate Event',
    'Conference',
    'Anniversary',
    'Reception',
    'Seminar',
    'Other'
  ]

  const calculateBalance = () => {
    const total = parseFloat(formData.totalAmount) || 0
    const advance = parseFloat(formData.advanceAmount) || 0
    return total - advance
  }

  return (
    <div className="w-full px-4 lg:px-6 py-4 relative z-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/function-halls/bookings"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <FaArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">New Function Hall Booking</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Event Details */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaCalendarAlt className="text-sky-400" />
                Event Details
              </h2>

              <div className="space-y-4">
                {/* Event Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Event Date *</label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                  />
                </div>

                {/* Function Hall Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Function Hall *</label>
                  {preselectedHallId && selectedHall ? (
                    // Show locked hall info when pre-selected from "Book Now"
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FaBuilding className="text-emerald-400 w-4 h-4" />
                        <span className="text-emerald-300 font-semibold">{selectedHall.name}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        {selectedHall.capacity} guests • ₹{selectedHall.pricePerDay.toLocaleString()}/day
                      </p>
                      {selectedHall.amenities && (
                        <p className="text-xs text-slate-500 mt-1">Amenities: {selectedHall.amenities}</p>
                      )}
                    </div>
                  ) : (
                    // Show dropdown when no hall is pre-selected
                    <>
                      <select
                        name="hallId"
                        value={formData.hallId}
                        onChange={handleChange}
                        required
                        className="form-input"
                      >
                        <option value="">Select a hall</option>
                        {halls.map((hall: any) => (
                          <option key={hall.id} value={hall.id} disabled={hall.status !== 'AVAILABLE'}>
                            {hall.name} - {hall.capacity} guests - ₹{hall.pricePerDay.toLocaleString()}/day
                            {hall.status !== 'AVAILABLE' && ' (Unavailable)'}
                          </option>
                        ))}
                      </select>
                      {selectedHall && (
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedHall.amenities && `Amenities: ${selectedHall.amenities}`}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Event Type *</label>
                  <select
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select event type</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Start Time *</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">End Time *</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Expected Guests */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Expected Guests *</label>
                  <div className="relative">
                    <FaUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="number"
                      name="expectedGuests"
                      value={formData.expectedGuests}
                      onChange={handleChange}
                      required
                      min="1"
                      max={selectedHall?.capacity || 9999}
                      className="form-input pl-10"
                      placeholder="Number of guests"
                    />
                  </div>
                  {selectedHall && (
                    <p className="text-xs text-slate-500 mt-1">Max capacity: {selectedHall.capacity} guests</p>
                  )}
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Special Requests</label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    rows={3}
                    className="form-input"
                    placeholder="Any special requirements..."
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Customer & Payment */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaUser className="text-sky-400" />
                Customer Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Customer Name *</label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                      className="form-input pl-10"
                      placeholder="Full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number *</label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      required
                      className="form-input pl-10"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email (Optional)</label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleChange}
                      className="form-input pl-10"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaRupeeSign className="text-sky-400" />
                Payment Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Total Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      name="totalAmount"
                      value={formData.totalAmount}
                      onChange={handleChange}
                      required
                      min="0"
                      className="form-input pl-8"
                      placeholder="Total amount"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Advance Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={formData.advanceAmount}
                      onChange={handleChange}
                      min="0"
                      max={formData.totalAmount || undefined}
                      className="form-input pl-8"
                      placeholder="Advance paid"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="pt-4 border-t border-white/5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Hall Charges</span>
                    <span className="text-white font-medium">₹{(parseFloat(formData.totalAmount) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Advance Paid</span>
                    <span className="text-emerald-400 font-medium">- ₹{(parseFloat(formData.advanceAmount) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-base pt-2 border-t border-white/5">
                    <span className="text-slate-300 font-medium">Balance Due</span>
                    <span className="text-amber-400 font-bold">₹{calculateBalance().toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    * Electricity & maintenance charges will be added from booking details
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20"
            >
              {createMutation.isPending ? 'Creating Booking...' : 'Create Booking'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function NewFunctionHallBookingPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewFunctionHallBookingContent />
    </Suspense>
  )
}
