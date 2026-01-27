'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaBuilding, FaUser, FaPhone, FaEnvelope, FaCalendarAlt, FaClock, FaUsers, FaRupeeSign, FaArrowLeft, FaBolt, FaWrench, FaSave } from 'react-icons/fa'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function EditFunctionHallBookingPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id as string

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    eventType: '',
    startTime: '',
    endTime: '',
    expectedGuests: '',
    totalAmount: '',
    advanceAmount: '',
    specialRequests: '',
    // Electricity meter readings
    meterReadingBefore: '',
    meterReadingAfter: '',
    electricityUnitPrice: '',
    // Additional charges
    maintenanceCharges: '',
    otherCharges: '',
    otherChargesNote: ''
  })

  // Fetch booking details
  const { data: bookingData, isLoading } = useQuery({
    queryKey: ['function-hall-booking', bookingId],
    queryFn: () => api.get(`/function-hall-bookings/${bookingId}`),
    enabled: !!bookingId
  })

  const booking = bookingData?.data || bookingData

  // Populate form when booking data loads
  useEffect(() => {
    if (booking) {
      setFormData({
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        customerEmail: booking.customerEmail || '',
        eventType: booking.eventType || '',
        startTime: booking.startTime || '',
        endTime: booking.endTime || '',
        expectedGuests: booking.expectedGuests?.toString() || '',
        totalAmount: booking.totalAmount?.toString() || '',
        advanceAmount: booking.advanceAmount?.toString() || '',
        specialRequests: booking.specialRequests || '',
        meterReadingBefore: booking.meterReadingBefore?.toString() || '',
        meterReadingAfter: booking.meterReadingAfter?.toString() || '',
        electricityUnitPrice: booking.electricityUnitPrice?.toString() || '8',
        maintenanceCharges: booking.maintenanceCharges?.toString() || '0',
        otherCharges: booking.otherCharges?.toString() || '0',
        otherChargesNote: booking.otherChargesNote || ''
      })
    }
  }, [booking])

  // Update booking mutation
  const updateMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => api.put(`/function-hall-bookings/${bookingId}`, data),
    endpoint: '/function-hall-bookings',
    onSuccess: () => {
      toast.success('Booking updated successfully!')
      router.push('/function-halls/bookings')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update booking')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
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

  // Calculate electricity charges
  const calculateElectricityCharges = () => {
    const before = parseFloat(formData.meterReadingBefore) || 0
    const after = parseFloat(formData.meterReadingAfter) || 0
    const unitPrice = parseFloat(formData.electricityUnitPrice) || 8
    if (after > before) {
      return (after - before) * unitPrice
    }
    return 0
  }

  // Calculate grand total
  const calculateGrandTotal = () => {
    const hallAmount = parseFloat(formData.totalAmount) || 0
    const electricity = calculateElectricityCharges()
    const maintenance = parseFloat(formData.maintenanceCharges) || 0
    const other = parseFloat(formData.otherCharges) || 0
    return hallAmount + electricity + maintenance + other
  }

  const calculateBalance = () => {
    const grandTotal = calculateGrandTotal()
    const advance = parseFloat(formData.advanceAmount) || 0
    return grandTotal - advance
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!booking) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="text-center py-12">
          <p className="text-slate-400">Booking not found</p>
          <Link href="/function-halls/bookings" className="text-sky-400 hover:underline mt-2 inline-block">
            Back to bookings
          </Link>
        </div>
      </div>
    )
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
        <div>
          <h1 className="text-xl font-bold text-white">Edit Booking</h1>
          <p className="text-sm text-slate-400">
            {booking.hall?.name} • {new Date(booking.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
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

            {/* Event Details */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaCalendarAlt className="text-sky-400" />
                Event Details
              </h2>
              
              <div className="space-y-4">
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
                      className="form-input pl-10"
                      placeholder="Number of guests"
                    />
                  </div>
                </div>

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

          {/* Right Column */}
          <div className="space-y-6">
            {/* Payment Details */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaRupeeSign className="text-emerald-400" />
                Payment Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Hall Amount *</label>
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
                      placeholder="Hall charges"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Advance Paid</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      name="advanceAmount"
                      value={formData.advanceAmount}
                      onChange={handleChange}
                      min="0"
                      className="form-input pl-8"
                      placeholder="Advance paid"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Electricity Meter */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaBolt className="text-yellow-400" />
                Electricity Meter
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Before Reading</label>
                    <input
                      type="number"
                      name="meterReadingBefore"
                      value={formData.meterReadingBefore}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="At event start"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">After Reading</label>
                    <input
                      type="number"
                      name="meterReadingAfter"
                      value={formData.meterReadingAfter}
                      onChange={handleChange}
                      min={formData.meterReadingBefore || 0}
                      step="0.01"
                      className="form-input"
                      placeholder="After event"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit Price (₹/kWh)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      name="electricityUnitPrice"
                      value={formData.electricityUnitPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="form-input pl-8"
                      placeholder="8"
                    />
                  </div>
                </div>

                {formData.meterReadingBefore && formData.meterReadingAfter && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Units Consumed:</span>
                      <span className="text-white font-medium">
                        {(parseFloat(formData.meterReadingAfter) - parseFloat(formData.meterReadingBefore)).toFixed(2)} kWh
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-400">Electricity Charges:</span>
                      <span className="text-yellow-400 font-bold">₹{calculateElectricityCharges().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Charges */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FaWrench className="text-slate-400" />
                Additional Charges
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Maintenance Charges</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      name="maintenanceCharges"
                      value={formData.maintenanceCharges}
                      onChange={handleChange}
                      min="0"
                      className="form-input pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Other Charges</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      name="otherCharges"
                      value={formData.otherCharges}
                      onChange={handleChange}
                      min="0"
                      className="form-input pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>

                {parseFloat(formData.otherCharges) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Other Charges Description</label>
                    <input
                      type="text"
                      name="otherChargesNote"
                      value={formData.otherChargesNote}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Describe other charges..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hall Charges</span>
                  <span className="text-white">₹{(parseFloat(formData.totalAmount) || 0).toLocaleString()}</span>
                </div>
                {calculateElectricityCharges() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Electricity</span>
                    <span className="text-yellow-400">₹{calculateElectricityCharges().toLocaleString()}</span>
                  </div>
                )}
                {parseFloat(formData.maintenanceCharges) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Maintenance</span>
                    <span className="text-white">₹{parseFloat(formData.maintenanceCharges).toLocaleString()}</span>
                  </div>
                )}
                {parseFloat(formData.otherCharges) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Other Charges</span>
                    <span className="text-white">₹{parseFloat(formData.otherCharges).toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">Grand Total</span>
                    <span className="text-white font-bold">₹{calculateGrandTotal().toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Advance Paid</span>
                  <span className="text-emerald-400">- ₹{(parseFloat(formData.advanceAmount) || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-medium">Balance Due</span>
                    <span className="text-amber-400 font-bold text-lg">₹{calculateBalance().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all disabled:opacity-50 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
