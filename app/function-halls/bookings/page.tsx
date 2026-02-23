'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaHistory, FaCalendarAlt, FaUser, FaPhone, FaBuilding, FaChevronLeft, FaChevronRight, FaTrash, FaCheck, FaTimes, FaBolt, FaEdit, FaFileInvoiceDollar, FaRupeeSign, FaPrint, FaDownload } from 'react-icons/fa'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import Link from 'next/link'
import { pdf } from '@react-pdf/renderer'
import { ConventionBillPDF } from '@/components/ConventionBillPDF'

export default function FunctionHallBookingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [includeTesting, setIncludeTesting] = useState(false)
  const [page, setPage] = useState(1)
  const [cancelModal, setCancelModal] = useState<{ show: boolean; bookingId: string | null }>({
    show: false,
    bookingId: null
  })
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; bookingId: string | null }>({
    show: false,
    bookingId: null
  })
  const [meterBooking, setMeterBooking] = useState<any | null>(null)
  const [meterData, setMeterData] = useState({
    meterReadingBefore: '',
    meterReadingAfter: '',
    electricityUnitPrice: '8',
    maintenanceCharges: '0',
    otherCharges: '0',
    otherChargesNote: ''
  })
  const [billModal, setBillModal] = useState<{ show: boolean; booking: any | null }>({
    show: false,
    booking: null
  })
  const [paymentAmount, setPaymentAmount] = useState('')

  // Fetch bookings
  const { data: bookingsData, isLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['function-hall-bookings', debouncedSearch, page, includeTesting],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (includeTesting) params.append('includeTesting', 'true')
      return api.get(`/function-hall-bookings?${params.toString()}`)
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  })

  const bookings = bookingsData?.data || []
  const pagination = bookingsData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
  const summary = bookingsData?.summary || { totalRevenue: 0, pendingAmount: 0, todayEvents: 0, upcomingEvents: 0 }

  const isTestingBooking = (booking: any) => {
    return booking.customerName.toLowerCase().includes('testing')
  }

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

  // Update meter reading mutation
  const updateMeterMutation = useMutationWithInvalidation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/function-hall-bookings/${id}`, data),
    endpoint: '/function-hall-bookings',
    onSuccess: async () => {
      setMeterBooking(null)
      setMeterData({ meterReadingBefore: '', meterReadingAfter: '', electricityUnitPrice: '8', maintenanceCharges: '0', otherCharges: '0', otherChargesNote: '' })
      toast.success('Meter reading and charges updated successfully')
      await refetchBookings()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update meter reading')
    }
  })

  // Record payment mutation
  const recordPaymentMutation = useMutationWithInvalidation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.put(`/function-hall-bookings/${id}`, {
        addPayment: amount
      }),
    endpoint: '/function-hall-bookings',
    onSuccess: async () => {
      setPaymentAmount('')
      toast.success('Payment recorded successfully')
      // Close bill modal and refresh data
      setBillModal({ show: false, booking: null })
      await refetchBookings()
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to record payment')
    }
  })

  const handleMeterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!meterBooking) return

    const beforeReading = parseFloat(meterData.meterReadingBefore) || 0
    const afterReading = parseFloat(meterData.meterReadingAfter) || 0

    if (afterReading && beforeReading && afterReading < beforeReading) {
      toast.error('After reading cannot be less than before reading')
      return
    }

    updateMeterMutation.mutate({
      id: meterBooking.id,
      data: {
        meterReadingBefore: meterData.meterReadingBefore || null,
        meterReadingAfter: meterData.meterReadingAfter || null,
        electricityUnitPrice: meterData.electricityUnitPrice || '8',
        maintenanceCharges: meterData.maintenanceCharges,
        otherCharges: meterData.otherCharges,
        otherChargesNote: meterData.otherChargesNote
      }
    })
  }

  const openMeterForm = (booking: any) => {
    setMeterData({
      meterReadingBefore: booking.meterReadingBefore?.toString() || '',
      meterReadingAfter: booking.meterReadingAfter?.toString() || '',
      electricityUnitPrice: booking.electricityUnitPrice?.toString() || '8',
      maintenanceCharges: booking.maintenanceCharges?.toString() || '0',
      otherCharges: booking.otherCharges?.toString() || '0',
      otherChargesNote: booking.otherChargesNote || ''
    })
    setMeterBooking(booking)
  }

  const openBillModal = (booking: any) => {
    setPaymentAmount('')
    setBillModal({ show: true, booking })
  }

  const handleRecordPayment = () => {
    if (!billModal.booking || !paymentAmount) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    if (amount > billModal.booking.balanceAmount) {
      toast.error('Payment amount cannot exceed balance')
      return
    }

    recordPaymentMutation.mutate({ id: billModal.booking.id, amount })
  }

  const handleDownloadPDF = async (booking: any) => {
    try {
      const blob = await pdf(<ConventionBillPDF booking={booking} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Bill-${booking.customerName}-${new Date(booking.eventDate).toLocaleDateString()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const handlePrint = async (booking: any) => {
    try {
      const blob = await pdf(<ConventionBillPDF booking={booking} />).toBlob()
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url)
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      } else {
        const link = document.createElement('a')
        link.href = url
        link.target = '_blank'
        link.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Error printing PDF:', error)
      toast.error('Failed to prepare print document')
    }
  }


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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FaHistory className="text-emerald-400" />
              Hall Bookings History
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage and track all function hall events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl px-3 py-2">
              <span className="text-xs text-slate-400">Testing Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTesting}
                  onChange={(e) => setIncludeTesting(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            <Link
              href="/function-halls/bookings/new"
              className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
            >
              <FaPlus />
              New Booking
            </Link>
          </div>
        </div>

        {/* Dash Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaRupeeSign className="text-emerald-400 text-lg" />
              <span className="text-[10px] text-slate-500 uppercase font-bold">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">₹{summary.totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Confirmed Revenue</p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaRupeeSign className="text-amber-400 text-lg" />
              <span className="text-[10px] text-slate-500 uppercase font-bold">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">₹{summary.pendingAmount.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">Balance to Collect</p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaCalendarAlt className="text-sky-400 text-lg" />
              <span className="text-[10px] text-slate-500 uppercase font-bold">Today</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.todayEvents}</p>
            <p className="text-[10px] text-slate-400 mt-1">Active Events</p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <FaCalendarAlt className="text-purple-400 text-lg" />
              <span className="text-[10px] text-slate-500 uppercase font-bold">7 Days</span>
            </div>
            <p className="text-2xl font-bold text-white">{summary.upcomingEvents}</p>
            <p className="text-[10px] text-slate-400 mt-1">Upcoming Events</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 mb-4">
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
            className="w-full max-w-sm"
          />
        </div>

        {/* Inline Meter & Charges Form */}
        {meterBooking && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-6 border border-yellow-500/30 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FaBolt className="text-yellow-400" />
                  Electricity & Additional Charges
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {meterBooking.customerName} • {meterBooking.hall?.name} • {new Date(meterBooking.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => {
                  setMeterBooking(null)
                  setMeterData({ meterReadingBefore: '', meterReadingAfter: '', electricityUnitPrice: '8', maintenanceCharges: '0', otherCharges: '0', otherChargesNote: '' })
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMeterSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Meter Readings */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Before Reading (at start)</label>
                  <input
                    type="number"
                    value={meterData.meterReadingBefore}
                    onChange={(e) => setMeterData(prev => ({ ...prev, meterReadingBefore: e.target.value }))}
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="Starting reading"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">After Reading (after event)</label>
                  <input
                    type="number"
                    value={meterData.meterReadingAfter}
                    onChange={(e) => setMeterData(prev => ({ ...prev, meterReadingAfter: e.target.value }))}
                    min={parseFloat(meterData.meterReadingBefore) || 0}
                    step="0.01"
                    className="form-input"
                    placeholder="Ending reading"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Unit Price (₹/kWh)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={meterData.electricityUnitPrice}
                      onChange={(e) => setMeterData(prev => ({ ...prev, electricityUnitPrice: e.target.value }))}
                      min="0"
                      step="0.01"
                      className="form-input pl-8"
                      placeholder="8"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Maintenance Charges</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={meterData.maintenanceCharges}
                      onChange={(e) => setMeterData(prev => ({ ...prev, maintenanceCharges: e.target.value }))}
                      min="0"
                      className="form-input pl-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Other Charges</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={meterData.otherCharges}
                      onChange={(e) => setMeterData(prev => ({ ...prev, otherCharges: e.target.value }))}
                      min="0"
                      className="form-input pl-8"
                    />
                  </div>
                </div>
                {parseFloat(meterData.otherCharges) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Other Charges Description</label>
                    <input
                      type="text"
                      value={meterData.otherChargesNote}
                      onChange={(e) => setMeterData(prev => ({ ...prev, otherChargesNote: e.target.value }))}
                      className="form-input"
                      placeholder="Description..."
                    />
                  </div>
                )}
              </div>

              {/* Electricity Calculation */}
              {meterData.meterReadingBefore && meterData.meterReadingAfter && parseFloat(meterData.meterReadingAfter) > parseFloat(meterData.meterReadingBefore) && (
                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Units Consumed:</span>
                    <span className="text-white font-medium">
                      {(parseFloat(meterData.meterReadingAfter) - parseFloat(meterData.meterReadingBefore)).toFixed(2)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">@ ₹{meterData.electricityUnitPrice || 8}/unit:</span>
                    <span className="text-yellow-400 font-bold">
                      ₹{((parseFloat(meterData.meterReadingAfter) - parseFloat(meterData.meterReadingBefore)) * parseFloat(meterData.electricityUnitPrice || '8')).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setMeterBooking(null)
                    setMeterData({ meterReadingBefore: '', meterReadingAfter: '', electricityUnitPrice: '8', maintenanceCharges: '0', otherCharges: '0', otherChargesNote: '' })
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMeterMutation.isPending}
                  className="px-6 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-500 disabled:opacity-50"
                >
                  {updateMeterMutation.isPending ? 'Saving...' : 'Save Charges'}
                </button>
              </div>
            </form>
          </div>
        )}

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
                      {isTestingBooking(booking) && (
                        <span className="text-xs px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold">
                          TEST DATA
                        </span>
                      )}
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
                      ₹{(booking.grandTotal || booking.totalAmount).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      Advance: ₹{booking.advanceAmount.toLocaleString()} |
                      Balance: <span className="text-amber-400">₹{booking.balanceAmount.toLocaleString()}</span>
                    </div>
                    {/* Electricity info */}
                    {booking.meterReadingBefore !== null && (
                      <div className="text-xs mb-2">
                        <span className="text-yellow-400 flex items-center justify-end gap-1">
                          <FaBolt className="w-3 h-3" />
                          {booking.meterReadingAfter !== null ? (
                            <span>
                              {booking.unitsConsumed?.toFixed(1)} units = ₹{booking.electricityCharges?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-500">Before: {booking.meterReadingBefore}</span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      {/* View Bill button */}
                      <button
                        onClick={() => openBillModal(booking)}
                        className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                        title="View Bill"
                      >
                        <FaFileInvoiceDollar className="w-4 h-4" />
                      </button>
                      {/* Edit button */}
                      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <Link
                          href={`/function-halls/bookings/${booking.id}`}
                          className="p-2 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors"
                          title="Edit Booking"
                        >
                          <FaEdit className="w-4 h-4" />
                        </Link>
                      )}
                      {/* Meter reading button - show for confirmed/completed bookings */}
                      {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
                        <button
                          onClick={() => openMeterForm(booking)}
                          className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                          title="Update Meter & Charges"
                        >
                          <FaBolt className="w-4 h-4" />
                        </button>
                      )}
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

      {/* Bill Modal */}
      {billModal.show && billModal.booking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl max-w-lg w-full rounded-2xl border border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaFileInvoiceDollar className="text-emerald-400" />
                Booking Bill
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(billModal.booking)}
                  className="p-2 text-sky-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Download PDF"
                >
                  <FaDownload className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePrint(billModal.booking)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Print Bill"
                >
                  <FaPrint className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer & Event Info */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-400">Customer:</span>
                  <span className="text-white ml-2">{billModal.booking.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-white ml-2">{billModal.booking.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400">Hall:</span>
                  <span className="text-white ml-2">{billModal.booking.hall?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Event:</span>
                  <span className="text-white ml-2">{billModal.booking.eventType}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-white ml-2">
                    {new Date(billModal.booking.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    ({billModal.booking.startTime} - {billModal.booking.endTime})
                  </span>
                </div>
              </div>
            </div>

            {/* Charges Breakdown */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Charges Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hall Charges</span>
                  <span className="text-white">₹{billModal.booking.totalAmount?.toLocaleString()}</span>
                </div>
                {billModal.booking.electricityCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      Electricity ({billModal.booking.unitsConsumed?.toFixed(1)} units @ ₹{billModal.booking.electricityUnitPrice || 8})
                    </span>
                    <span className="text-yellow-400">₹{billModal.booking.electricityCharges?.toLocaleString()}</span>
                  </div>
                )}
                {billModal.booking.maintenanceCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Maintenance</span>
                    <span className="text-white">₹{billModal.booking.maintenanceCharges?.toLocaleString()}</span>
                  </div>
                )}
                {billModal.booking.otherCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">
                      Other{billModal.booking.otherChargesNote ? ` (${billModal.booking.otherChargesNote})` : ''}
                    </span>
                    <span className="text-white">₹{billModal.booking.otherCharges?.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-slate-300">Grand Total</span>
                    <span className="text-white">₹{(billModal.booking.grandTotal || billModal.booking.totalAmount)?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Payment Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount Paid</span>
                  <span className="text-emerald-400">₹{billModal.booking.advanceAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Balance Due</span>
                  <span className={billModal.booking.balanceAmount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    ₹{billModal.booking.balanceAmount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Record Payment */}
              {billModal.booking.balanceAmount > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-xs font-medium text-slate-400 mb-2">Record Payment</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min="0"
                        max={billModal.booking.balanceAmount}
                        className="form-input text-sm pl-7 w-full"
                        placeholder="Enter amount"
                      />
                    </div>
                    <button
                      onClick={handleRecordPayment}
                      disabled={recordPaymentMutation.isPending || !paymentAmount}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <FaRupeeSign className="w-3 h-3" />
                      {recordPaymentMutation.isPending ? 'Saving...' : 'Record'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setBillModal({ show: false, booking: null })}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
