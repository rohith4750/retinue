'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaArrowLeft, FaCreditCard, FaIdCard, FaTag, FaEye } from 'react-icons/fa'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { FormInput, FormSelect, FormTextarea } from '@/components/FormComponents'
import { useFormValidation } from '@/hooks/useFormValidation'
import { bookingValidationRules } from '@/lib/form-validation'

function NewBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const initialFormData = {
    roomId: searchParams.get('roomId') || '',
    slotId: searchParams.get('slotId') || '',
    guestName: '',
    guestPhone: '',
    guestIdProof: '',
    guestIdProofType: 'AADHAR',
    guestAddress: '',
    checkIn: '',
    checkOut: '',
    paymentMode: 'CASH',
    discount: '0',
  }

  // Use form validation hook
  const {
    formData,
    errors,
    updateField,
    validate,
    handleBlur,
    getError,
    setFormData,
  } = useFormValidation(initialFormData, bookingValidationRules)

  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [selectedSlot, setSelectedSlot] = useState<any>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  // Fetch available rooms based on selected dates
  const { data: availableRoomsData, isLoading: roomsLoading, refetch: refetchRooms } = useQuery({
    queryKey: ['available-rooms', formData.checkIn, formData.checkOut],
    queryFn: () => {
      // If dates are selected, fetch rooms available for those dates
      if (formData.checkIn && formData.checkOut) {
        const checkInDate = new Date(formData.checkIn).toISOString()
        const checkOutDate = new Date(formData.checkOut).toISOString()
        return api.get(`/rooms/available?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}`)
      }
      // Otherwise, fetch all non-maintenance rooms
      return api.get('/rooms/available')
    },
  })

  // Extract rooms array from response
  const availableRooms = availableRoomsData?.rooms || availableRoomsData || []

  // Fetch room details if roomId is provided
  const { data: room } = useQuery({
    queryKey: ['room', formData.roomId],
    queryFn: () => api.get(`/rooms/${formData.roomId}`),
    enabled: !!formData.roomId,
  })

  useEffect(() => {
    if (room) {
      setSelectedRoom(room)
    } else if (availableRooms && formData.roomId) {
      // Find room from available rooms list
      const foundRoom = availableRooms.find((r: any) => r.id === formData.roomId)
      if (foundRoom) setSelectedRoom(foundRoom)
    }
  }, [room, availableRooms, formData.roomId])

  // Slot will be handled during booking creation if slotId is provided

  const createMutation = useMutationWithInvalidation({
    mutationFn: async (data: any) => {
      const days =
        (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
      const baseAmount = (selectedSlot?.price || selectedRoom?.basePrice || 0) * Math.max(1, days)
      const discountAmount = parseFloat(data.discount) || 0
      const subtotal = baseAmount - discountAmount
      const totalAmount = Math.max(0, subtotal)

      // Ensure dates are sent as ISO strings
      // Handle datetime-local format (YYYY-MM-DDTHH:mm) and convert to ISO
      if (!data.checkIn || !data.checkOut) {
        throw new Error('Check-in and check-out dates are required')
      }
      
      const checkInDate = new Date(data.checkIn)
      const checkOutDate = new Date(data.checkOut)
      
      if (isNaN(checkInDate.getTime())) {
        throw new Error('Invalid check-in date')
      }
      if (isNaN(checkOutDate.getTime())) {
        throw new Error('Invalid check-out date')
      }
      
      const checkInISO = checkInDate.toISOString()
      const checkOutISO = checkOutDate.toISOString()

      return api.post('/bookings', {
        roomId: data.roomId || selectedRoom?.id,
        slotId: data.slotId || '',
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestIdProof: data.guestIdProof,
        guestIdProofType: data.guestIdProofType,
        guestAddress: data.guestAddress,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        totalAmount,
        discount: discountAmount,
        paymentMode: data.paymentMode,
      })
    },
    endpoint: '/bookings', // Automatically invalidates all related queries
    onSuccess: () => {
      toast.success('Booking created successfully!')
      router.push('/bookings')
    },
    onError: (error: any) => {
      // Phase 2: Better error handling with user-friendly messages
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create booking'
      
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'ROOM_UNAVAILABLE': 'The selected room is not available. Please choose another room.',
        'DATE_CONFLICT': 'The room is already booked for these dates. Please select different dates.',
        'INVALID_DATE': 'Invalid date range. Please check your check-in and check-out dates.',
        'VALIDATION_ERROR': errorMessage.includes('check-in') 
          ? 'Invalid check-in date. Please select a valid date and time.'
          : errorMessage.includes('check-out')
          ? 'Invalid check-out date. Please select a valid date and time.'
          : 'Please check all fields and try again.',
      }
      
      const errorCode = error?.response?.data?.error
      const friendlyMessage = errorMessages[errorCode] || errorMessage
      
      toast.error(friendlyMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form before submission
    if (!validate()) {
      toast.error('Please fix the errors in the form')
      return
    }
    
    createMutation.mutate(formData)
  }

  const calculateOverview = () => {
    if (!selectedRoom) return null

    const days =
      formData.checkIn && formData.checkOut
        ? Math.max(
            1,
            (new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 1

    const baseAmount = (selectedSlot?.price || selectedRoom?.basePrice || 0) * days
    const discountAmount = parseFloat(formData.discount) || 0
    const subtotal = baseAmount - discountAmount
    const tax = subtotal * 0.18 // 18% GST
    const totalAmount = Math.max(0, subtotal + tax)

    return {
      days,
      baseAmount,
      discountAmount,
      subtotal,
      tax,
      totalAmount,
    }
  }

  const overview = calculateOverview()

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
            <h1 className="text-2xl font-bold text-slate-100 flex items-center">
              <FaCalendarAlt className="mr-2 w-5 h-5" />
              Create New Booking
            </h1>
            <p className="text-sm text-slate-400 mt-1">Fill in the booking details below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guest Details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <FaIdCard className="mr-2 w-4 h-4" />
                Guest Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Guest Name *"
                  type="text"
                  value={formData.guestName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('guestName', e.target.value)}
                  onBlur={() => handleBlur('guestName')}
                  error={getError('guestName')}
                  placeholder="Full name"
                />
                <FormInput
                  label="Phone Number *"
                  type="tel"
                  value={formData.guestPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('guestPhone', e.target.value)}
                  onBlur={() => handleBlur('guestPhone')}
                  error={getError('guestPhone')}
                  placeholder="10 digits"
                />
                <FormSelect
                  label="ID Proof Type *"
                  value={formData.guestIdProofType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('guestIdProofType', e.target.value)}
                  options={[
                    { value: 'AADHAR', label: 'Aadhar' },
                    { value: 'PASSPORT', label: 'Passport' },
                    { value: 'DRIVING_LICENSE', label: 'Driving License' },
                    { value: 'PAN_CARD', label: 'PAN Card' },
                    { value: 'VOTER_ID', label: 'Voter ID' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
                <FormInput
                  label="ID Proof Number"
                  type="text"
                  value={formData.guestIdProof}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('guestIdProof', e.target.value)}
                  placeholder="ID proof number"
                />
                <div className="md:col-span-2">
                  <FormTextarea
                    label="Address"
                    value={formData.guestAddress}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('guestAddress', e.target.value)}
                    onBlur={() => handleBlur('guestAddress')}
                    error={getError('guestAddress')}
                    rows={3}
                    placeholder="Guest address"
                  />
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4">Booking Details</h3>
              
              {/* Date selection hint */}
              {!formData.checkIn || !formData.checkOut ? (
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-sky-400">
                    💡 Select check-in and check-out dates first to see available rooms for those dates.
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
                  <p className="text-sm text-emerald-400">
                    ✓ Showing {availableRooms?.length || 0} room(s) available for selected dates
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormSelect
                    label="Select Room *"
                    value={formData.roomId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const selectedId = e.target.value
                      updateField('roomId', selectedId)
                      const room = availableRooms?.find((r: any) => r.id === selectedId)
                      if (room) setSelectedRoom(room)
                    }}
                    onBlur={() => handleBlur('roomId')}
                    error={getError('roomId')}
                    disabled={roomsLoading || (!formData.checkIn || !formData.checkOut)}
                    options={[
                      { value: '', label: formData.checkIn && formData.checkOut ? 'Select a room' : 'Select dates first' },
                      ...(availableRooms?.map((room: any) => ({
                        value: room.id,
                        label: `Room ${room.roomNumber} - ${room.roomType} (₹${room.basePrice}/day, Floor ${room.floor})`,
                      })) || []),
                    ]}
                  />
                  {selectedRoom && (
                    <p className="text-xs text-slate-400 mt-1">
                      Selected: Room {selectedRoom.roomNumber} ({selectedRoom.roomType}) - ₹{selectedRoom.basePrice}/day
                    </p>
                  )}
                  {roomsLoading && (
                    <p className="text-xs text-slate-500 mt-1">Loading available rooms...</p>
                  )}
                  {!roomsLoading && formData.checkIn && formData.checkOut && availableRooms && availableRooms.length === 0 && (
                    <p className="text-xs text-yellow-400 mt-1">No rooms available for selected dates. Try different dates.</p>
                  )}
                </div>
                <div>
                  <FormInput
                    label="Slot ID (Optional)"
                    type="text"
                    value={formData.slotId}
                    onChange={(e) => updateField('slotId', e.target.value)}
                    placeholder="Slot ID (optional)"
                  />
                </div>
                <FormInput
                  label="Check-in Date & Time *"
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    updateField('checkIn', e.target.value)
                    // Clear room selection when dates change
                    if (formData.roomId) {
                      updateField('roomId', '')
                      setSelectedRoom(null)
                    }
                    // Re-validate checkOut when checkIn changes
                    if (formData.checkOut) {
                      setTimeout(() => handleBlur('checkOut'), 100)
                    }
                  }}
                  onBlur={() => handleBlur('checkIn')}
                  error={getError('checkIn')}
                />
                <FormInput
                  label="Check-out Date & Time *"
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    updateField('checkOut', e.target.value)
                    // Clear room selection when dates change
                    if (formData.roomId) {
                      updateField('roomId', '')
                      setSelectedRoom(null)
                    }
                    // Clear error when user starts typing
                    if (errors.checkOut) {
                      // Re-validate after a short delay
                      setTimeout(() => handleBlur('checkOut'), 100)
                    }
                  }}
                  onBlur={() => handleBlur('checkOut')}
                  error={getError('checkOut')}
                />
              </div>
            </div>

            {/* Payment & Discount */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <FaCreditCard className="mr-2 w-4 h-4" />
                Payment & Discount
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Payment Mode *</label>
                  <select
                    required
                    value={formData.paymentMode}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentMode: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="WALLET">Wallet</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData({ ...formData, discount: e.target.value })
                    }
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Overview */}
            {overview && (
              <div>
                <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                  <FaEye className="mr-2 w-4 h-4" />
                  Booking Overview
                </h3>
                <div className="bg-slate-800/40 rounded-xl p-4 space-y-3 border border-white/5">
                  {selectedRoom && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Room</span>
                      <span className="text-slate-200 font-medium">
                        Room {selectedRoom.roomNumber} ({selectedRoom.roomType})
                      </span>
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Slot</span>
                      <span className="text-slate-200 font-medium">
                        {selectedSlot.slotType.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-200 font-medium">{overview.days} day(s)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Base Amount</span>
                    <span className="text-slate-200 font-medium">
                      ₹{overview.baseAmount.toLocaleString()}
                    </span>
                  </div>
                  {overview.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Discount</span>
                      <span className="text-emerald-400 font-medium">
                        -₹{overview.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-200 font-medium">
                      ₹{overview.subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">GST (18%)</span>
                    <span className="text-slate-200 font-medium">
                      ₹{overview.tax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-white/5">
                    <span className="text-slate-200 font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-sky-400">
                      ₹{overview.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="card">
              <div className="card-header">
                <h1 className="text-2xl font-bold text-slate-100">Loading...</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <NewBookingContent />
    </Suspense>
  )
}
