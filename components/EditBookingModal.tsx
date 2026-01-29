'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaEdit, FaIdCard, FaUsers } from 'react-icons/fa'
import { FormInput, FormSelect, FormTextarea } from '@/components/FormComponents'
import { useFormValidation } from '@/hooks/useFormValidation'
import { editBookingValidationRules } from '@/lib/form-validation'

const ID_PROOF_PATTERNS: Record<string, { pattern: RegExp; message: string; placeholder: string; maxLength: number; inputType: string }> = {
  AADHAR: { pattern: /^\d{12}$/, message: 'Aadhaar must be exactly 12 digits', placeholder: '123456789012', maxLength: 12, inputType: 'tel' },
  PAN_CARD: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: 'PAN format: ABCDE1234F', placeholder: 'ABCDE1234F', maxLength: 10, inputType: 'text' },
  PASSPORT: { pattern: /^[A-Z][0-9]{7}$/, message: 'Passport: 1 letter + 7 digits', placeholder: 'A1234567', maxLength: 8, inputType: 'text' },
  DRIVING_LICENSE: { pattern: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,13}$/, message: 'Invalid Driving License format', placeholder: 'MH0120190001234', maxLength: 17, inputType: 'text' },
  VOTER_ID: { pattern: /^[A-Z]{3}[0-9]{7}$/, message: 'Voter ID: 3 letters + 7 digits', placeholder: 'ABC1234567', maxLength: 10, inputType: 'text' },
  OTHER: { pattern: /^.{3,}$/, message: 'ID must be at least 3 characters', placeholder: 'Enter ID number', maxLength: 30, inputType: 'text' },
}

function toDatetimeLocal(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

function setDefaultCheckout(checkInValue: string) {
  if (!checkInValue) return ''
  const checkInDate = new Date(checkInValue)
  const nextDay = new Date(checkInDate)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setHours(11, 0, 0, 0)
  const y = nextDay.getFullYear()
  const m = String(nextDay.getMonth() + 1).padStart(2, '0')
  const d = String(nextDay.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}T11:00`
}

const initialFormData = {
  roomIds: [] as string[],
  slotId: '',
  guestName: '',
  guestPhone: '',
  guestIdProof: '',
  guestIdProofType: 'AADHAR',
  guestAddress: '',
  guestType: 'WALK_IN',
  numberOfGuests: '1',
  checkIn: '',
  checkOut: '',
  flexibleCheckout: false,
  paymentMode: 'CASH',
  advanceAmount: '0',
  discount: '0',
  applyGst: false,
  extraBed: false,
  extraBedCount: '1',
  extraBedPrice: '500',
}

export function EditBookingModal({
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
  const {
    formData,
    errors,
    updateField,
    validate,
    handleBlur,
    getError,
    setFormData,
  } = useFormValidation(initialFormData, editBookingValidationRules)

  const [idProofError, setIdProofError] = useState('')
  const validateIdProof = (type: string, value: string) => {
    if (!value) { setIdProofError(''); return true }
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

  useEffect(() => {
    if (!booking) return
    const guest = booking.guest || {}
    setFormData({
      ...initialFormData,
      roomIds: booking.room?.id ? [booking.room.id] : [],
      guestName: guest.name || '',
      guestPhone: guest.phone || '',
      guestIdProof: guest.idProof || '',
      guestIdProofType: guest.idProofType || 'AADHAR',
      guestAddress: guest.address || '',
      guestType: guest.guestType || 'WALK_IN',
      numberOfGuests: String(booking.numberOfGuests ?? 1),
      checkIn: toDatetimeLocal(booking.checkIn),
      checkOut: toDatetimeLocal(booking.checkOut),
      flexibleCheckout: !!booking.flexibleCheckout,
      discount: String(booking.discount ?? 0),
      applyGst: !!booking.applyGst,
    })
  }, [booking, setFormData])

  // Edit: only show the room already in the booking — do not fetch or show remaining/other rooms
  const selectedRoomId = formData.roomIds[0] || booking?.room?.id || null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast.error('Please fix the errors in the form')
      return
    }
    const checkInDate = new Date(formData.checkIn)
    const checkOutDate = new Date(formData.checkOut)
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      toast.error('Invalid dates')
      return
    }
    if (!selectedRoomId) {
      toast.error('Please select a room')
      return
    }
    onSave({
      guestName: formData.guestName,
      guestPhone: formData.guestPhone,
      guestIdProof: formData.guestIdProof || undefined,
      guestIdProofType: formData.guestIdProofType,
      guestAddress: formData.guestAddress || undefined,
      guestType: formData.guestType,
      numberOfGuests: parseInt(formData.numberOfGuests) || 1,
      flexibleCheckout: formData.flexibleCheckout,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
      roomId: selectedRoomId,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 relative z-10 flex-shrink-0 border-b border-white/5">
          <h2 className="text-lg font-bold text-slate-100 flex items-center">
            <FaEdit className="mr-2 w-4 h-4" />
            Edit Booking
          </h2>
          <p className="text-xs text-slate-400 mt-1">Same fields as Add Booking — update below</p>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Guest Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
              <FaIdCard className="mr-2 w-4 h-4" />
              Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormInput label="Guest Name *" type="text" value={formData.guestName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('guestName', e.target.value)} onBlur={() => handleBlur('guestName')} error={getError('guestName')} placeholder="Full name" />
              <FormInput label="Phone Number *" type="tel" value={formData.guestPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('guestPhone', e.target.value)} onBlur={() => handleBlur('guestPhone')} error={getError('guestPhone')} placeholder="10 digits" />
              <FormSelect label="Guest Type *" value={formData.guestType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateField('guestType', e.target.value)} options={[{ value: 'WALK_IN', label: 'Walk-in' }, { value: 'CORPORATE', label: 'Corporate' }, { value: 'OTA', label: 'OTA' }, { value: 'GOVERNMENT', label: 'Government' }, { value: 'REGULAR', label: 'Regular Guest' }, { value: 'AGENT', label: 'Travel Agent' }, { value: 'FAMILY', label: 'Family/Friends' }]} />
              <FormSelect label="ID Proof Type *" value={formData.guestIdProofType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { updateField('guestIdProofType', e.target.value); if (formData.guestIdProof) validateIdProof(e.target.value, formData.guestIdProof) }} options={[{ value: 'AADHAR', label: 'Aadhaar Card' }, { value: 'PAN_CARD', label: 'PAN Card' }, { value: 'PASSPORT', label: 'Passport' }, { value: 'DRIVING_LICENSE', label: 'Driving License' }, { value: 'VOTER_ID', label: 'Voter ID' }, { value: 'OTHER', label: 'Other' }]} />
              <div>
                <label className="form-label">ID Proof Number</label>
                <input type={ID_PROOF_PATTERNS[formData.guestIdProofType]?.inputType || 'text'} value={formData.guestIdProof} onChange={(e) => { let value = e.target.value; if (formData.guestIdProofType === 'AADHAR') value = value.replace(/\D/g, ''); else value = value.toUpperCase(); const maxLen = ID_PROOF_PATTERNS[formData.guestIdProofType]?.maxLength || 30; if (value.length <= maxLen) { updateField('guestIdProof', value); validateIdProof(formData.guestIdProofType, value) } }} onBlur={() => validateIdProof(formData.guestIdProofType, formData.guestIdProof)} placeholder={ID_PROOF_PATTERNS[formData.guestIdProofType]?.placeholder || 'Enter ID number'} maxLength={ID_PROOF_PATTERNS[formData.guestIdProofType]?.maxLength || 30} className={`form-input ${idProofError ? 'border-red-500' : ''}`} />
                {idProofError && <p className="text-xs text-red-400 mt-1">{idProofError}</p>}
              </div>
              <div>
                <label className="form-label flex items-center gap-2"><FaUsers className="w-3 h-3 text-slate-400" /> Number of Guests *</label>
                <select value={formData.numberOfGuests} onChange={(e) => updateField('numberOfGuests', e.target.value)} className="form-select">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (<option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>))}
                  <option value="10+">More than 10</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <FormTextarea label="Address" value={formData.guestAddress} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField('guestAddress', e.target.value)} onBlur={() => handleBlur('guestAddress')} error={getError('guestAddress')} rows={2} placeholder="Guest address" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold mr-2">1</span>
              Select Dates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Check-in Date & Time *" type="datetime-local" value={formData.checkIn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const newCheckIn = e.target.value; updateField('checkIn', newCheckIn); if (newCheckIn && !formData.checkOut) updateField('checkOut', setDefaultCheckout(newCheckIn)); if (formData.checkOut) setTimeout(() => handleBlur('checkOut'), 100) }} onBlur={() => handleBlur('checkIn')} error={getError('checkIn')} />
              <div className="space-y-2">
                <FormInput label={formData.flexibleCheckout ? 'Expected Check-out (Tentative)' : 'Check-out Date & Time *'} type="datetime-local" value={formData.checkOut} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const newCheckOut = e.target.value; updateField('checkOut', newCheckOut); updateField('flexibleCheckout', false); if (formData.checkIn && newCheckOut) { const hoursDiff = (new Date(newCheckOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 60 * 60); if (hoursDiff < 12) { toast.error('Minimum stay is 12 hours.'); const corrected = new Date(new Date(formData.checkIn).getTime() + 12 * 60 * 60 * 1000); updateField('checkOut', corrected.toISOString().slice(0, 16)) } }; if (errors.checkOut) setTimeout(() => handleBlur('checkOut'), 100) }} onBlur={() => handleBlur('checkOut')} error={getError('checkOut')} />
                {formData.checkIn && <p className="text-[10px] text-slate-500">Minimum checkout: {new Date(new Date(formData.checkIn).getTime() + 12 * 60 * 60 * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} (12 hours min)</p>}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={formData.flexibleCheckout} onChange={(e) => { updateField('flexibleCheckout', e.target.checked); if (e.target.checked && formData.checkIn) updateField('checkOut', setDefaultCheckout(formData.checkIn)) }} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-800" />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300">Checkout time not confirmed (flexible)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Room: edit shows only the added room (no remaining/other rooms to choose) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-4 flex items-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold mr-2">2</span>
              Room (fixed for this booking)
            </h3>
            {booking?.room ? (
              <div className="p-4 rounded-lg border-2 border-sky-500/50 bg-sky-500/10">
                <p className="font-bold text-slate-100">Room {booking.room.roomNumber} ({booking.room.roomType})</p>
                <p className="text-sm text-slate-400 mt-1">Floor {booking.room.floor} • ₹{booking.room.basePrice ?? 0}/day</p>
                <p className="text-xs text-slate-500 mt-2">Room cannot be changed when editing. Create a new booking to assign a different room.</p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center"><p className="text-sm text-slate-400">No room assigned</p></div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
