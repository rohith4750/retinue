'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaCalendarAlt, FaArrowLeft, FaCreditCard, FaIdCard, FaTag, FaEye, FaUsers, FaPercent } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { FormInput, FormSelect, FormTextarea } from '@/components/FormComponents'
import { useFormValidation } from '@/hooks/useFormValidation'
import { bookingValidationRules } from '@/lib/form-validation'

function NewBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const roomIdParam = searchParams.get('roomId')
  const initialFormData = {
    roomIds: roomIdParam ? [roomIdParam] : [] as string[],
    slotId: searchParams.get('slotId') || '',
    guestName: '',
    guestPhone: '',
    guestIdProof: '',
    guestIdProofType: 'AADHAR',
    guestAddress: '',
    guestType: 'WALK_IN',
    numberOfGuests: '1',
    checkIn: '',
    checkOut: '',
    flexibleCheckout: false, // When true, checkout time is tentative/TBD
    paymentMode: 'CASH',
    advanceAmount: '0',
    discount: '0',
    applyGst: true,
    extraBed: false,
    extraBedCount: '1',
    extraBedPrice: '500', // Default price, user can change
  }

  // Auto-set default checkout time when flexible checkout is enabled
  const setDefaultCheckout = (checkInValue: string) => {
    if (!checkInValue) return ''
    const checkInDate = new Date(checkInValue)
    // Default: Next day at 11:00 AM (standard hotel checkout)
    const nextDay = new Date(checkInDate)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(11, 0, 0, 0)
    // Format for datetime-local input
    const year = nextDay.getFullYear()
    const month = String(nextDay.getMonth() + 1).padStart(2, '0')
    const day = String(nextDay.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}T11:00`
  }

  // ID Proof validation patterns for Indian documents
  const ID_PROOF_PATTERNS: Record<string, { pattern: RegExp; message: string; placeholder: string; maxLength: number; inputType: string }> = {
    AADHAR: {
      pattern: /^\d{12}$/,
      message: 'Aadhaar must be exactly 12 digits',
      placeholder: '123456789012',
      maxLength: 12,
      inputType: 'tel', // Use tel for numeric keyboard on mobile
    },
    PAN_CARD: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      message: 'PAN format: ABCDE1234F',
      placeholder: 'ABCDE1234F',
      maxLength: 10,
      inputType: 'text',
    },
    PASSPORT: {
      pattern: /^[A-Z][0-9]{7}$/,
      message: 'Passport: 1 letter + 7 digits',
      placeholder: 'A1234567',
      maxLength: 8,
      inputType: 'text',
    },
    DRIVING_LICENSE: {
      pattern: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,13}$/,
      message: 'Invalid Driving License format',
      placeholder: 'MH0120190001234',
      maxLength: 17,
      inputType: 'text',
    },
    VOTER_ID: {
      pattern: /^[A-Z]{3}[0-9]{7}$/,
      message: 'Voter ID: 3 letters + 7 digits',
      placeholder: 'ABC1234567',
      maxLength: 10,
      inputType: 'text',
    },
    OTHER: {
      pattern: /^.{3,}$/,
      message: 'ID must be at least 3 characters',
      placeholder: 'Enter ID number',
      maxLength: 30,
      inputType: 'text',
    },
  }

  const [idProofError, setIdProofError] = useState('')

  // Validate ID proof based on type
  const validateIdProof = (type: string, value: string) => {
    if (!value) {
      setIdProofError('')
      return true
    }
    const validation = ID_PROOF_PATTERNS[type]
    if (!validation) return true
    
    const cleanValue = value.replace(/\s/g, '').toUpperCase()
    if (!validation.pattern.test(cleanValue)) {
      setIdProofError(validation.message)
      return false
    }
    setIdProofError('')
    return true
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

  const [selectedRooms, setSelectedRooms] = useState<any[]>([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)

  // Auth is handled by root layout

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
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Extract rooms array from response
  const availableRooms = availableRoomsData?.rooms || availableRoomsData || []

  // Update selectedRooms when roomIds or availableRooms change
  useEffect(() => {
    if (availableRooms && formData.roomIds.length > 0) {
      const rooms = availableRooms.filter((r: any) => formData.roomIds.includes(r.id))
      setSelectedRooms(rooms)
    } else {
      setSelectedRooms([])
    }
  }, [availableRooms, formData.roomIds])

  // Slot will be handled during booking creation if slotId is provided

  const createMutation = useMutationWithInvalidation({
    mutationFn: async (data: any) => {
      // Ensure dates are sent as ISO strings
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

      const days = Math.max(1, (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const discountAmount = parseFloat(data.discount) || 0
      const extraBedCount = data.extraBed ? parseInt(data.extraBedCount) || 1 : 0
      const extraBedPrice = parseFloat(data.extraBedPrice) || 0
      const extraBedAmount = extraBedCount * extraBedPrice * days

      // Single booking per room: send unique room IDs so we never create duplicate bookings
      const uniqueRoomIds = data.roomIds ? Array.from(new Set(data.roomIds)) : []
      if (uniqueRoomIds.length > 0) {
        // Calculate total for all rooms
        const totalBaseAmount = selectedRooms.reduce((total, room) => {
          return total + ((selectedSlot?.price || room?.basePrice || 0) * days)
        }, 0)
        const subtotal = totalBaseAmount + extraBedAmount - discountAmount
        const gstAmount = data.applyGst ? subtotal * 0.18 : 0
        const totalAmount = Math.max(0, subtotal + gstAmount)
        const advanceAmount = parseFloat(data.advanceAmount) || 0

        return api.post('/bookings', {
          roomIds: uniqueRoomIds,
          slotId: data.slotId || '',
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestIdProof: data.guestIdProof,
          guestIdProofType: data.guestIdProofType,
          guestAddress: data.guestAddress,
          guestType: data.guestType,
          numberOfGuests: parseInt(data.numberOfGuests) || 1,
          checkIn: checkInISO,
          checkOut: checkOutISO,
          flexibleCheckout: data.flexibleCheckout || false,
          totalAmount,
          discount: discountAmount,
          gstAmount: gstAmount,
          applyGst: data.applyGst,
          advanceAmount: advanceAmount,
          balanceAmount: Math.max(0, totalAmount - advanceAmount),
          extraBed: data.extraBed,
          extraBedCount: extraBedCount,
          extraBedAmount: extraBedAmount,
          paymentMode: data.paymentMode,
        })
      }

      throw new Error('Please select at least one room')
    },
    endpoint: '/bookings', // Automatically invalidates all related queries
    onSuccess: (result: any) => {
      const roomCount = result?.bookings?.length || 1
      toast.success(`${roomCount} room${roomCount > 1 ? 's' : ''} booked successfully!`)
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
    if (selectedRooms.length === 0) return null

    const days =
      formData.checkIn && formData.checkOut
        ? Math.max(
            1,
            (new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 1

    // Calculate total base amount for all selected rooms
    const baseAmount = selectedRooms.reduce((total, room) => {
      return total + ((selectedSlot?.price || room?.basePrice || 0) * days)
    }, 0)
    
    // Extra bed calculation
    const extraBedCount = formData.extraBed ? parseInt(formData.extraBedCount) || 1 : 0
    const extraBedPrice = parseFloat(formData.extraBedPrice) || 0
    const extraBedAmount = extraBedCount * extraBedPrice * days
    
    const discountAmount = parseFloat(formData.discount) || 0
    const subtotal = baseAmount + extraBedAmount - discountAmount
    
    // GST only if toggle is on
    const tax = formData.applyGst ? subtotal * 0.18 : 0 // 18% GST only if applied
    const totalAmount = Math.max(0, subtotal + tax)
    
    // Advance and balance
    const advanceAmount = parseFloat(formData.advanceAmount) || 0
    const balanceAmount = Math.max(0, totalAmount - advanceAmount)

    return {
      days,
      baseAmount,
      extraBedCount,
      extraBedPrice,
      extraBedAmount,
      discountAmount,
      subtotal,
      tax,
      totalAmount,
      advanceAmount,
      balanceAmount,
      gstApplied: formData.applyGst,
    }
  }

  const overview = calculateOverview()

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
            <h1 className="text-xl font-bold text-slate-100 flex items-center">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  label="Guest Type *"
                  value={formData.guestType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('guestType', e.target.value)}
                  options={[
                    { value: 'WALK_IN', label: 'Walk-in' },
                    { value: 'CORPORATE', label: 'Corporate' },
                    { value: 'OTA', label: 'OTA (Online Booking)' },
                    { value: 'GOVERNMENT', label: 'Government' },
                    { value: 'REGULAR', label: 'Regular Guest' },
                    { value: 'AGENT', label: 'Travel Agent' },
                    { value: 'FAMILY', label: 'Family/Friends' },
                  ]}
                />
                <FormSelect
                  label="ID Proof Type *"
                  value={formData.guestIdProofType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    updateField('guestIdProofType', e.target.value)
                    // Re-validate ID proof when type changes
                    if (formData.guestIdProof) {
                      validateIdProof(e.target.value, formData.guestIdProof)
                    }
                  }}
                  options={[
                    { value: 'AADHAR', label: 'Aadhaar Card' },
                    { value: 'PAN_CARD', label: 'PAN Card' },
                    { value: 'PASSPORT', label: 'Passport' },
                    { value: 'DRIVING_LICENSE', label: 'Driving License' },
                    { value: 'VOTER_ID', label: 'Voter ID' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
                <div>
                  <label className="form-label">ID Proof Number</label>
                  <input
                    type={ID_PROOF_PATTERNS[formData.guestIdProofType]?.inputType || 'text'}
                    value={formData.guestIdProof}
                    onChange={(e) => {
                      let value = e.target.value
                      // For Aadhaar, only allow digits
                      if (formData.guestIdProofType === 'AADHAR') {
                        value = value.replace(/\D/g, '') // Remove non-digits
                      } else {
                        value = value.toUpperCase()
                      }
                      // Respect max length
                      const maxLen = ID_PROOF_PATTERNS[formData.guestIdProofType]?.maxLength || 30
                      if (value.length <= maxLen) {
                        updateField('guestIdProof', value)
                        validateIdProof(formData.guestIdProofType, value)
                      }
                    }}
                    onBlur={() => validateIdProof(formData.guestIdProofType, formData.guestIdProof)}
                    placeholder={ID_PROOF_PATTERNS[formData.guestIdProofType]?.placeholder || 'Enter ID number'}
                    maxLength={ID_PROOF_PATTERNS[formData.guestIdProofType]?.maxLength || 30}
                    className={`form-input ${idProofError ? 'border-red-500' : ''}`}
                  />
                  {idProofError && (
                    <p className="text-xs text-red-400 mt-1">{idProofError}</p>
                  )}
                </div>
                <div>
                  <label className="form-label flex items-center gap-2">
                    <FaUsers className="w-3 h-3 text-slate-400" />
                    Number of Guests *
                  </label>
                  <select
                    value={formData.numberOfGuests}
                    onChange={(e) => updateField('numberOfGuests', e.target.value)}
                    className="form-select"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                    <option value="10+">More than 10</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Address"
                    value={formData.guestAddress}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('guestAddress', e.target.value)}
                    onBlur={() => handleBlur('guestAddress')}
                    error={getError('guestAddress')}
                    rows={2}
                    placeholder="Guest address"
                  />
                </div>
              </div>
            </div>

            {/* Step 1: Select Dates */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold mr-2">1</span>
                Select Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Check-in Date & Time *"
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newCheckIn = e.target.value
                    updateField('checkIn', newCheckIn)
                    
                    // Auto-set checkout to next day 11 AM if not already set
                    if (newCheckIn && !formData.checkOut) {
                      updateField('checkOut', setDefaultCheckout(newCheckIn))
                    }
                    
                    // Clear room selection when dates change
                    if (formData.roomIds.length > 0) {
                      updateField('roomIds', [])
                      setSelectedRooms([])
                    }
                    // Re-validate checkOut when checkIn changes
                    if (formData.checkOut) {
                      setTimeout(() => handleBlur('checkOut'), 100)
                    }
                  }}
                  onBlur={() => handleBlur('checkIn')}
                  error={getError('checkIn')}
                />
                <div className="space-y-2">
                  <FormInput
                    label={formData.flexibleCheckout ? "Expected Check-out (Tentative)" : "Check-out Date & Time *"}
                    type="datetime-local"
                    value={formData.checkOut}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const newCheckOut = e.target.value
                      updateField('checkOut', newCheckOut)
                      updateField('flexibleCheckout', false) // Disable flexible if manually changed
                      
                      // Validate minimum stay (at least 12 hours)
                      if (formData.checkIn && newCheckOut) {
                        const checkInTime = new Date(formData.checkIn).getTime()
                        const checkOutTime = new Date(newCheckOut).getTime()
                        const hoursDiff = (checkOutTime - checkInTime) / (1000 * 60 * 60)
                        
                        if (hoursDiff < 12) {
                          toast.error('Minimum stay is 12 hours. Check-out must be at least 12 hours after check-in.')
                          // Auto-correct to 12 hours after check-in
                          const correctedCheckout = new Date(checkInTime + (12 * 60 * 60 * 1000))
                          const year = correctedCheckout.getFullYear()
                          const month = String(correctedCheckout.getMonth() + 1).padStart(2, '0')
                          const day = String(correctedCheckout.getDate()).padStart(2, '0')
                          const hours = String(correctedCheckout.getHours()).padStart(2, '0')
                          const mins = String(correctedCheckout.getMinutes()).padStart(2, '0')
                          updateField('checkOut', `${year}-${month}-${day}T${hours}:${mins}`)
                        }
                      }
                      
                      // Clear room selection when dates change
                      if (formData.roomIds.length > 0) {
                        updateField('roomIds', [])
                        setSelectedRooms([])
                      }
                      // Clear error when user starts typing
                      if (errors.checkOut) {
                        setTimeout(() => handleBlur('checkOut'), 100)
                      }
                    }}
                    onBlur={() => handleBlur('checkOut')}
                    error={getError('checkOut')}
                  />
                  {/* Minimum checkout hint */}
                  {formData.checkIn && (
                    <p className="text-[10px] text-slate-500">
                      Minimum checkout: {new Date(new Date(formData.checkIn).getTime() + 12*60*60*1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (12 hours min)
                    </p>
                  )}
                  
                  {/* Flexible Checkout Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.flexibleCheckout}
                      onChange={(e) => {
                        updateField('flexibleCheckout', e.target.checked)
                        if (e.target.checked && formData.checkIn) {
                          // Auto-set default checkout (next day 11 AM)
                          updateField('checkOut', setDefaultCheckout(formData.checkIn))
                          // Clear room selection
                          if (formData.roomIds.length > 0) {
                            updateField('roomIds', [])
                            setSelectedRooms([])
                          }
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800"
                    />
                    <span className="text-xs text-slate-400 group-hover:text-slate-300">
                      Checkout time not confirmed (flexible)
                    </span>
                  </label>
                  {formData.flexibleCheckout && (
                    <p className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                      Default: Next day 11 AM. Can be updated later when guest confirms.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Select Room */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${formData.checkIn && formData.checkOut ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-400'}`}>2</span>
                Select Room
                {formData.checkIn && formData.checkOut && (
                  <span className="ml-auto text-xs font-normal text-emerald-400">
                    {roomsLoading ? 'Loading...' : `${availableRooms?.length || 0} available`}
                  </span>
                )}
              </h3>

              {/* Show selected date/time range */}
              {formData.checkIn && formData.checkOut && (
                <div className="mb-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-400">
                    Showing rooms available from{' '}
                    <span className="text-sky-400 font-medium">
                      {new Date(formData.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' '}at{' '}
                      {new Date(formData.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    {' '}to{' '}
                    <span className="text-sky-400 font-medium">
                      {new Date(formData.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' '}at{' '}
                      {new Date(formData.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </p>
                </div>
              )}
              
              {!formData.checkIn || !formData.checkOut ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center">
                  <p className="text-sm text-slate-400">Select check-in and check-out date & time first</p>
                </div>
              ) : roomsLoading ? (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : availableRooms?.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
                  <p className="text-sm text-yellow-400">No rooms available for the selected date & time range.</p>
                  <p className="text-xs text-yellow-400/70 mt-1">Try selecting different dates or times.</p>
                </div>
              ) : (
                <>
                  {/* Selected rooms count */}
                  {formData.roomIds.length > 0 && (
                    <div className="mb-3 p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                      <p className="text-sm text-sky-400 font-medium">
                        {formData.roomIds.length} room{formData.roomIds.length > 1 ? 's' : ''} selected
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableRooms?.map((room: any) => {
                      const isSelected = formData.roomIds.includes(room.id)
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => {
                            // Toggle selection: one booking per room, no duplicates
                            if (isSelected) {
                              updateField('roomIds', formData.roomIds.filter((id) => id !== room.id))
                            } else {
                              const next = [...formData.roomIds, room.id]
                              updateField('roomIds', Array.from(new Set(next)))
                            }
                          }}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/30'
                              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-100">Room {room.roomNumber}</span>
                            {/* Checkbox-style indicator for multi-select */}
                            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-500'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            <p>{room.roomType} • Floor {room.floor}</p>
                            <p className="text-sky-400 font-semibold">₹{room.basePrice}/day</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
              {formData.roomIds.length === 0 && formData.checkIn && formData.checkOut && availableRooms?.length > 0 && (
                <p className="text-xs text-yellow-400 mt-2">Please select at least one room</p>
              )}
            </div>

            {/* Extra Bed Option */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <FaTag className="mr-2 w-4 h-4" />
                Additional Services
              </h3>
              <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.extraBed}
                        onChange={(e) => setFormData({ ...formData, extraBed: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                    <span className="text-sm font-medium text-slate-100">Extra Bed</span>
                  </div>
                  {formData.extraBed && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-400">Qty:</label>
                        <select
                          value={formData.extraBedCount}
                          onChange={(e) => setFormData({ ...formData, extraBedCount: e.target.value })}
                          className="form-select w-16 py-1 text-sm"
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-400">Price/bed/day:</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.extraBedPrice}
                            onChange={(e) => setFormData({ ...formData, extraBedPrice: e.target.value })}
                            className="form-input w-24 py-1 pl-6 text-sm"
                            placeholder="500"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Payment & Discount */}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
                <FaCreditCard className="mr-2 w-4 h-4" />
                Payment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <label className="form-label">Advance Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.advanceAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, advanceAmount: e.target.value })
                    }
                    className="form-input"
                    placeholder="0.00"
                  />
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
                <div>
                  <label className="form-label flex items-center gap-2">
                    <FaPercent className="w-3 h-3 text-slate-400" />
                    GST (18%)
                  </label>
                  <div className="flex items-center h-[42px] px-3 bg-slate-800/60 rounded-lg border border-white/10">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.applyGst}
                        onChange={(e) => setFormData({ ...formData, applyGst: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="ml-2 text-sm text-slate-300">
                        {formData.applyGst ? 'Applied' : 'Not Applied'}
                      </span>
                    </label>
                  </div>
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
                  {/* Show all selected rooms */}
                  {selectedRooms.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-slate-400 text-sm">
                        {selectedRooms.length === 1 ? 'Room' : `Rooms (${selectedRooms.length})`}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedRooms.map((room) => (
                          <span key={room.id} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-200">
                            Room {room.roomNumber} ({room.roomType}) - ₹{room.basePrice}/day
                          </span>
                        ))}
                      </div>
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
                    <span className="text-slate-400">Base Amount ({selectedRooms.length} room{selectedRooms.length > 1 ? 's' : ''} × {overview.days} day{overview.days > 1 ? 's' : ''})</span>
                    <span className="text-slate-200 font-medium">
                      ₹{overview.baseAmount.toLocaleString()}
                    </span>
                  </div>
                  {overview.extraBedAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Extra Bed ({overview.extraBedCount} × {overview.days} day{overview.days > 1 ? 's' : ''} × ₹{overview.extraBedPrice})</span>
                      <span className="text-sky-400 font-medium">
                        +₹{overview.extraBedAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
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
                    <span className={`${overview.gstApplied ? 'text-slate-400' : 'text-slate-500 line-through'}`}>
                      GST (18%)
                      {!overview.gstApplied && <span className="ml-1 text-xs text-slate-500">(Not Applied)</span>}
                    </span>
                    <span className={`font-medium ${overview.gstApplied ? 'text-slate-200' : 'text-slate-500'}`}>
                      {overview.gstApplied ? `₹${overview.tax.toLocaleString()}` : '₹0'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-white/5">
                    <span className="text-slate-200 font-semibold">Total Amount</span>
                    <span className="text-xl font-bold text-sky-400">
                      ₹{overview.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  {overview.advanceAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-emerald-400">Advance Paid</span>
                        <span className="text-emerald-400 font-medium">
                          -₹{overview.advanceAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/5">
                        <span className="text-orange-400 font-semibold">Balance Due</span>
                        <span className="text-xl font-bold text-orange-400">
                          ₹{overview.balanceAmount.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
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
    </>
  )
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <NewBookingContent />
    </Suspense>
  )
}
