'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaHome, FaEdit, FaTrash, FaPlus, FaCalendarAlt, FaClock, FaFilter, FaList, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}-${m}-${d}T${hh}:${mm}`
}

function getDefaultAvailabilityWindow() {
  const now = new Date()
  now.setSeconds(0, 0)
  const nextDay = new Date(now)
  nextDay.setDate(nextDay.getDate() + 1)
  return {
    checkIn: formatDateTimeLocal(now),
    checkOut: formatDateTimeLocal(nextDay),
  }
}

function getStartOfTodayLocal() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return formatDateTimeLocal(d)
}

function getCheckOutPlus24h(checkInLocal: string) {
  const dt = new Date(checkInLocal)
  if (Number.isNaN(dt.getTime())) return ''
  dt.setDate(dt.getDate() + 1)
  return formatDateTimeLocal(dt)
}

export default function RoomsPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  // Default date filter should be "today"
  const [filterCheckIn, setFilterCheckIn] = useState(() => getDefaultAvailabilityWindow().checkIn)
  const [filterCheckOut, setFilterCheckOut] = useState(() => getDefaultAvailabilityWindow().checkOut)
  // Always show today's availability by default (no extra "Check Availability" click)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    roomId: string | null
  }>({
    show: false,
    roomId: null,
  })

  // Calendar view state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [calendarFloorFilter, setCalendarFloorFilter] = useState<string>('all')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
  }, [])

  // Calculate end date for the 7-day view
  const calendarEndDate = new Date(calendarStartDate)
  calendarEndDate.setDate(calendarEndDate.getDate() + 8) // +8 days to cover slightly more than the week to be safe with timezone/overlap

  // Fetch bookings for calendar view (include ONLINE so grid shows correct Free/Booked for all sources)
  const { data: bookingsResponse } = useQuery({
    queryKey: ['bookings-calendar', calendarStartDate.toISOString()],
    queryFn: () => {
      const from = calendarStartDate.toISOString()
      const to = calendarEndDate.toISOString()
      // Use efficient date range filter backend instead of fetching all
      return api.get(`/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&forCalendar=1&limit=1000`)
    },
    staleTime: 0,
  })
  // Handle both { data: [...], pagination } and direct array from API
  const bookings = Array.isArray(bookingsResponse?.data)
    ? bookingsResponse.data
    : Array.isArray(bookingsResponse)
      ? bookingsResponse
      : []

  // Generate 7 days for calendar
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(calendarStartDate)
    date.setDate(date.getDate() + i)
    return date
  })

  // In calendar: show "Checked In" only on today's column, not future days.
  const getBookingDisplayStatusForDate = (booking: any, date: Date) => {
    if (!booking) return null
    if (booking.status !== 'CHECKED_IN') return booking.status

    const day = new Date(date)
    day.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return day.getTime() === today.getTime() ? 'CHECKED_IN' : 'CONFIRMED'
  }

  // Check if a room is booked on a specific date
  const getRoomBookingForDate = (roomId: string, date: Date) => {
    const dateStart = new Date(date)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(date)
    dateEnd.setHours(23, 59, 59, 999)

    return bookings.find((booking: any) => {
      const bookingRoomId = booking.room?.id ?? booking.roomId
      if (bookingRoomId !== roomId) return false
      if (booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT') return false
      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)
      return checkIn <= dateEnd && checkOut >= dateStart
    })
  }

  // Navigate calendar
  const navigateCalendar = (direction: 'prev' | 'next') => {
    setCalendarStartDate(prev => {
      const newDate = new Date(prev)
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
      return newDate
    })
  }

  const goToToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    setCalendarStartDate(today)
  }

  // Check if user can manage rooms (ADMIN or SUPER_ADMIN only)
  const canManageRooms = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  const queryClient = useQueryClient()

  // Fetch rooms - refetch on mount, window focus (so list updates after checkout in another tab), and when filters change
  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['rooms', debouncedSearch, filterCheckIn, filterCheckOut, isCheckingAvailability],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      if (isCheckingAvailability && filterCheckIn && filterCheckOut) {
        const checkInDate = new Date(filterCheckIn).toISOString()
        const checkOutDate = new Date(filterCheckOut).toISOString()
        return api.get(`/rooms/available?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}`)
      }
      return api.get(`/rooms?${params.toString()}`)
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true, // Refetch when user returns to tab so list updates after checkout elsewhere
  })

  // Extract rooms array from response (handles both /rooms and /rooms/available responses)
  const roomsData = rooms?.rooms || rooms || []

  const handleClearFilter = () => {
    const { checkIn, checkOut } = getDefaultAvailabilityWindow()
    setFilterCheckIn(checkIn)
    setFilterCheckOut(checkOut)
    setIsCheckingAvailability(true)
    setShowDateFilter(false)
  }

  // Filter rooms client-side if needed (for additional filtering)
  const filteredRooms = roomsData?.filter((room: any) => {
    if (!debouncedSearch) return true
    const search = debouncedSearch.toLowerCase()
    return (
      room.roomNumber.toLowerCase().includes(search) ||
      room.roomType.toLowerCase().includes(search) ||
      room.status.toLowerCase().includes(search)
    )
  }) || []

  // Group rooms by category (roomType) – only categories that have rooms
  const categoryOrder = ['STANDARD', 'SUITE', 'SUITE_PLUS']
  const roomsByCategory = (() => {
    const map: Record<string, any[]> = {}
    filteredRooms.forEach((room: any) => {
      const type = room.roomType || 'OTHER'
      if (!map[type]) map[type] = []
      map[type].push(room)
    })
    const keys = Object.keys(map)
    keys.sort((a, b) => {
      const i = categoryOrder.indexOf(a)
      const j = categoryOrder.indexOf(b)
      if (i !== -1 && j !== -1) return i - j
      if (i !== -1) return -1
      if (j !== -1) return 1
      return a.localeCompare(b)
    })
    return keys.map((key) => ({ category: key, rooms: map[key] }))
  })()

  // Get unique floors for filter
  const uniqueFloors = Array.from(new Set(filteredRooms.map((r: any) => r.floor))).sort((a: any, b: any) => a - b)

  // Calendar shows the SAME rooms as the list (optionally by floor)
  const calendarRooms = calendarFloorFilter === 'all'
    ? filteredRooms
    : filteredRooms.filter((r: any) => r.floor === parseInt(calendarFloorFilter))

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setConfirmModal({ show: false, roomId: null })
      toast.success('Room deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete room')
    },
  })

  const handleDelete = (id: string) => {
    setConfirmModal({ show: true, roomId: id })
  }

  const confirmDelete = () => {
    if (confirmModal.roomId) {
      deleteMutation.mutate(confirmModal.roomId)
    }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header: Search/Filter on left, Add Room on right */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          {/* Left: Search and Date Filter Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-48"
            />
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isCheckingAvailability
                  ? 'bg-sky-600/20 border-sky-500 text-sky-400'
                  : 'bg-slate-800/60 border-white/5 text-slate-300 hover:border-slate-600'
                }`}
            >
              <FaFilter className="w-3 h-3" />
              <span className="text-sm">Date & Time Filter</span>
              {isCheckingAvailability && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded">
                  {filteredRooms.length}
                </span>
              )}
            </button>
            {isCheckingAvailability && (
              <button
                onClick={handleClearFilter}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                Clear Filter
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/60 rounded-lg border border-white/5 p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                <FaList className="w-3 h-3" />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'calendar' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
              >
                <FaCalendarAlt className="w-3 h-3" />
                Calendar
              </button>
            </div>
          </div>

          {/* Right: Add Room button */}
          {canManageRooms && (
            <button
              onClick={() => {
                setEditingRoom(null)
                setShowModal(true)
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              <span>Add Room</span>
            </button>
          )}
        </div>

        {/* Date & Time Filter Panel */}
        {showDateFilter && (
          <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-white/10">
            <div className="flex flex-wrap items-end gap-4">
              {/* Single Date & Time */}
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  <FaCalendarAlt className="inline w-3 h-3 mr-1" />
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={filterCheckIn}
                  min={getStartOfTodayLocal()}
                  onChange={(e) => {
                    // Prevent selecting past dates (before today)
                    const min = getStartOfTodayLocal()
                    const nextValue = e.target.value && e.target.value < min ? min : e.target.value
                    setFilterCheckIn(nextValue)
                    // Always auto-set checkout to +24h (hidden)
                    if (nextValue) {
                      setFilterCheckOut(getCheckOutPlus24h(nextValue))
                    } else {
                      setFilterCheckOut('')
                    }
                    setIsCheckingAvailability(true)
                  }}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">* Availability by check-in / check-out dates</p>
              </div>
            </div>

            {/* Show selected filter info */}
            {isCheckingAvailability && filterCheckIn && filterCheckOut && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-slate-400">
                  Showing rooms available from{' '}
                  <span className="text-sky-400 font-medium">
                    {new Date(filterCheckIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' at '}
                    {new Date(filterCheckIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  {' to '}
                  <span className="text-sky-400 font-medium">
                    {new Date(filterCheckOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' at '}
                    {new Date(filterCheckOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Calendar View - same rooms as list, more interesting UI */}
        {viewMode === 'calendar' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden mb-4 bg-gradient-to-b from-slate-800/80 to-slate-900/80 shadow-xl">
            {calendarRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <FaCalendarAlt className="w-14 h-14 text-slate-500 mb-4" />
                <p className="text-base font-semibold text-slate-300 mb-1">No rooms to show</p>
                <p className="text-sm text-slate-500">Same rooms as the list. Add or adjust filters to see rooms here.</p>
              </div>
            ) : (
              <>
                {/* Calendar Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 bg-slate-900/60 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-white/10">
                      <button
                        onClick={() => navigateCalendar('prev')}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-lg transition-all"
                      >
                        <FaChevronLeft className="w-4 h-4" />
                      </button>
                      <h3 className="text-base font-bold text-white min-w-[120px] text-center">
                        {calendarStartDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => navigateCalendar('next')}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700/80 rounded-lg transition-all"
                      >
                        <FaChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={goToToday}
                      className="px-3 py-2 text-xs font-semibold text-sky-300 bg-sky-500/20 hover:bg-sky-500/30 rounded-xl border border-sky-500/40 transition-all"
                    >
                      Today
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-white/5">
                      {calendarRooms.length} room{calendarRooms.length !== 1 ? 's' : ''}
                    </span>
                    <select
                      value={calendarFloorFilter}
                      onChange={(e) => setCalendarFloorFilter(e.target.value)}
                      className="px-3 py-2 text-xs bg-slate-800 border border-slate-600 rounded-xl text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 outline-none"
                    >
                      <option value="all">All Floors</option>
                      {uniqueFloors.map((floor: any) => (
                        <option key={floor} value={floor}>Floor {floor}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-900/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-36 sticky left-0 bg-slate-800/95 z-10 border-r border-white/5">Room</th>
                        {calendarDays.map((date, i) => {
                          const isToday = date.toDateString() === new Date().toDateString()
                          return (
                            <th key={i} className={`px-2 py-3 text-center min-w-[110px] border-r border-white/5 last:border-r-0 ${isToday ? 'bg-sky-500/15 ring-inset ring-1 ring-sky-500/30' : ''}`}>
                              <div className={`text-[10px] uppercase tracking-wider font-medium ${isToday ? 'text-sky-400' : 'text-slate-500'}`}>
                                {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                              </div>
                              <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-sky-300' : 'text-slate-300'}`}>
                                {date.getDate()}
                              </div>
                              <div className={`text-[10px] ${isToday ? 'text-sky-400/80' : 'text-slate-500'}`}>
                                {date.toLocaleDateString('en-IN', { month: 'short' })}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {calendarRooms.map((room: any) => (
                        <tr key={room.id} className="border-t border-white/5 hover:bg-slate-700/10 transition-colors">
                          <td className="px-3 py-2.5 sticky left-0 bg-slate-800/95 z-10 border-r border-white/5">
                            <div className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 w-full ${room.status === 'AVAILABLE' ? 'bg-emerald-500/10 border-emerald-500/40' :
                                room.status === 'BOOKED' ? 'bg-red-500/10 border-red-500/40' :
                                  'bg-amber-500/10 border-amber-500/40'
                              }`}>
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                                  room.status === 'BOOKED' ? 'bg-red-400' :
                                    'bg-amber-400'
                                }`} />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white">{room.roomNumber}</p>
                                <p className="text-[10px] text-slate-400">{room.roomType} • F{room.floor} • ₹{room.basePrice?.toLocaleString?.() ?? room.basePrice}</p>
                                {room.status === 'MAINTENANCE' && room.maintenanceReason && (
                                  <p className="text-[9px] text-amber-300/90 mt-0.5 truncate" title={room.maintenanceReason}>{room.maintenanceReason}</p>
                                )}
                                {room.status === 'BOOKED' && (room.checkInAt || room.checkOutAt) && (
                                  <div className="text-[9px] text-red-300/90 mt-0.5 space-y-0.5">
                                    {room.checkInAt && (
                                      <p title="Check-in time">In: {new Date(room.checkInAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(room.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                    )}
                                    {room.checkOutAt && (
                                      <p title="Check-out time">Out: {new Date(room.checkOutAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(room.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {calendarDays.map((date, i) => {
                            const booking = getRoomBookingForDate(room.id, date)
                            const isToday = date.toDateString() === new Date().toDateString()
                            const displayStatus = booking ? getBookingDisplayStatusForDate(booking, date) : null
                            return (
                              <td key={i} className={`px-1.5 py-1.5 align-top border-r border-white/5 last:border-r-0 ${isToday ? 'bg-sky-500/8' : ''}`}>
                                {booking ? (
                                  <div
                                    className={`px-2 py-2 rounded-xl text-center cursor-pointer transition-all hover:scale-[1.03] shadow-sm ${displayStatus === 'CHECKED_IN' ? 'bg-sky-500/25 border border-sky-500/50 shadow-sky-500/10' :
                                        displayStatus === 'CONFIRMED' ? 'bg-emerald-500/25 border border-emerald-500/50 shadow-emerald-500/10' :
                                          'bg-amber-500/25 border border-amber-500/50 shadow-amber-500/10'
                                      }`}
                                    title={`${booking.guest?.name || 'Guest'} - ${displayStatus}${booking.source === 'ONLINE' ? ' (Online)' : ' (Staff)'}`}
                                  >
                                    <p className={`text-[11px] font-semibold truncate ${displayStatus === 'CHECKED_IN' ? 'text-sky-200' :
                                        displayStatus === 'CONFIRMED' ? 'text-emerald-200' :
                                          'text-amber-200'
                                      }`}>
                                      {booking.guest?.name?.split(' ')[0] || 'Guest'}
                                    </p>
                                    <p className={`text-[9px] font-medium mt-0.5 ${displayStatus === 'CHECKED_IN' ? 'text-sky-400' :
                                        displayStatus === 'CONFIRMED' ? 'text-emerald-400' :
                                          'text-amber-400'
                                      }`}>
                                      {displayStatus === 'CHECKED_IN' ? 'Checked In' : displayStatus === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                                    </p>
                                    <p className={`text-[8px] mt-0.5 font-medium ${booking.source === 'ONLINE' ? 'text-violet-300/90' : 'text-slate-400/90'
                                      }`}>
                                      {booking.source === 'ONLINE' ? 'Online' : 'Staff'}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="px-2 py-2 rounded-xl text-center bg-slate-700/15 border border-slate-600/30">
                                    <p className="text-[10px] font-medium text-slate-500">Free</p>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="px-5 py-3 bg-slate-900/40 border-t border-white/10 flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-lg bg-emerald-500/30 border border-emerald-500/50 shadow-sm" />
                    <span className="text-slate-400 font-medium">Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-lg bg-sky-500/30 border border-sky-500/50 shadow-sm" />
                    <span className="text-slate-400 font-medium">Checked In</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-lg bg-amber-500/30 border border-amber-500/50 shadow-sm" />
                    <span className="text-slate-400 font-medium">Pending</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-lg bg-slate-700/40 border border-slate-600/50" />
                    <span className="text-slate-400 font-medium">Free</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs ml-2 pl-2 border-l border-white/10">
                    <span className="text-violet-400 font-medium">Online</span>
                    <span className="text-slate-500">= public site</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Staff</span>
                    <span className="text-slate-500">= staff booking</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* List View – category-wise (only categories that have rooms) */}
        {viewMode === 'list' && roomsByCategory.length > 0 ? (
          <div className="flex flex-col gap-6">
            {roomsByCategory.map(({ category, rooms: categoryRooms }) => (
              <div key={category} className="rounded-xl border border-white/5 bg-slate-900/40 overflow-hidden">
                {/* Category header */}
                <div className="px-4 py-3 bg-slate-800/60 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                    {category.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {categoryRooms.length} room{categoryRooms.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {/* Room chips in this category */}
                <div className="flex flex-wrap gap-3 p-4">
                  {categoryRooms.map((room: any) => (
                    <div
                      key={room.id}
                      className={`inline-flex items-center px-4 py-2.5 rounded-full border-2 cursor-pointer transition-all hover:scale-[1.02] ${room.status === 'AVAILABLE'
                          ? 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30'
                          : room.status === 'BOOKED'
                            ? 'bg-red-500/20 border-red-500 hover:bg-red-500/30'
                            : 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30'
                        }`}
                      onClick={() => {
                        if (canManageRooms) {
                          setEditingRoom(room)
                          setShowModal(true)
                        }
                      }}
                    >
                      <span className={`text-sm font-bold ${room.status === 'AVAILABLE' ? 'text-emerald-300' :
                          room.status === 'BOOKED' ? 'text-red-300' :
                            'text-yellow-300'
                        }`}>{room.roomNumber}</span>
                      <span className={`w-px h-5 mx-3 ${room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          room.status === 'BOOKED' ? 'bg-red-400' :
                            'bg-yellow-400'
                        }`} />
                      <span className="text-sm font-semibold text-white">₹{room.basePrice?.toLocaleString?.() ?? room.basePrice}</span>
                      <span className={`w-px h-5 mx-3 ${room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          room.status === 'BOOKED' ? 'bg-red-400' :
                            'bg-yellow-400'
                        }`} />
                      <span className={`text-[10px] font-semibold uppercase ${room.status === 'AVAILABLE' ? 'text-emerald-400' :
                          room.status === 'BOOKED' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>{room.status}</span>
                      {room.status === 'MAINTENANCE' && room.maintenanceReason && (
                        <>
                          <span className="w-px h-5 mx-3 bg-yellow-400" />
                          <span className="text-[10px] text-amber-200/90 max-w-[120px] truncate" title={room.maintenanceReason}>
                            {room.maintenanceReason}
                          </span>
                        </>
                      )}
                      {room.status === 'BOOKED' && (room.checkInAt || room.checkOutAt) && (
                        <>
                          {room.checkInAt && (
                            <>
                              <span className={`w-px h-5 mx-3 ${room.status === 'BOOKED' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                              <span className="text-[10px] text-slate-400" title="Check-in time">
                                In: {new Date(room.checkInAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(room.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </>
                          )}
                          {room.checkOutAt && (
                            <>
                              <span className={`w-px h-5 mx-3 ${room.status === 'BOOKED' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                              <span className="text-[10px] text-slate-400" title="Check-out time">
                                Out: {new Date(room.checkOutAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(room.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {canManageRooms && (
                        <>
                          <span className={`w-px h-5 mx-3 ${room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                              room.status === 'BOOKED' ? 'bg-red-400' :
                                'bg-yellow-400'
                            }`} />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(room.id)
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-red-500/30"
                            title="Delete"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="card text-center py-12">
            <div className="flex flex-col items-center">
              <FaHome className="text-4xl mb-3 text-slate-500" />
              <p className="text-base font-semibold text-slate-300 mb-1.5">No rooms found</p>
              {canManageRooms ? (
                <>
                  <p className="text-xs text-slate-500 mb-4">Click "Add Room" to create your first room</p>
                  <button
                    onClick={() => {
                      setEditingRoom(null)
                      setShowModal(true)
                    }}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    <span>Create Your First Room</span>
                  </button>
                </>
              ) : (
                <p className="text-xs text-slate-500">No rooms available at the moment</p>
              )}
            </div>
          </div>
        ) : null}

        {showModal && canManageRooms && (
          <RoomModal
            room={editingRoom}
            onClose={() => {
              setShowModal(false)
              setEditingRoom(null)
            }}
          />
        )}

        <ConfirmationModal
          show={confirmModal.show}
          title="Delete Room"
          message="Are you sure you want to delete this room? This action cannot be undone."
          action="Delete"
          type="delete"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal({ show: false, roomId: null })}
          isLoading={deleteMutation.isPending}
          confirmText="Delete Room"
        />
      </div>
    </>
  )
}

const MAINTENANCE_PRESETS = ['Electronics', 'AC', 'Fans', 'Carpenter', 'Plumbing', 'Painting', 'Other']

function RoomModal({ room, onClose }: { room: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || '',
    roomType: room?.roomType || 'SINGLE',
    floor: room?.floor || '',
    basePrice: room?.basePrice || '',
    capacity: room?.capacity || '',
    status: room?.status || 'AVAILABLE',
    maintenanceReason: room?.maintenanceReason || '',
  })

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/rooms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      onClose()
      toast.success('Room created successfully')
    },
    onError: () => {
      toast.error('Failed to create room')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/rooms/${room.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      onClose()
      toast.success('Room updated successfully')
    },
    onError: () => {
      toast.error('Failed to update room')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...formData }
    if (formData.status !== 'MAINTENANCE') payload.maintenanceReason = ''
    if (room) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  const addMaintenancePreset = (preset: string) => {
    const current = (formData.maintenanceReason || '').trim()
    const parts = current ? current.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    if (parts.includes(preset)) return
    setFormData((prev) => ({
      ...prev,
      maintenanceReason: [...parts, preset].join(', '),
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 relative z-10">
          <div className="card-header">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center">
              {room ? <FaEdit className="mr-2 w-6 h-6" /> : <FaPlus className="mr-2 w-6 h-6" />}
              {room ? 'Edit Room' : 'Create New Room'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {room ? 'Update room information' : 'Add a new room to the system'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Room Number *</label>
                <input
                  type="text"
                  required
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNumber: e.target.value })
                  }
                  className="form-input"
                  placeholder="e.g., 101, 102"
                />
              </div>
              <div>
                <label className="form-label">Room Type *</label>
                <select
                  value={formData.roomType}
                  onChange={(e) =>
                    setFormData({ ...formData, roomType: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="SINGLE">Single</option>
                  <option value="DOUBLE">Double</option>
                  <option value="DELUXE">Deluxe</option>
                  <option value="STANDARD">Standard</option>
                  <option value="SUITE">Suite</option>
                  <option value="SUITE_PLUS">Suite+</option>
                </select>
              </div>
              <div>
                <label className="form-label">Floor *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                  className="form-input"
                  placeholder="Floor number"
                />
              </div>
              <div>
                <label className="form-label">Base Price (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: e.target.value })
                  }
                  className="form-input"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="form-label">Capacity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: e.target.value })
                  }
                  className="form-input"
                  placeholder="Number of guests"
                />
              </div>
              <div>
                <label className="form-label">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value, ...(e.target.value !== 'MAINTENANCE' ? { maintenanceReason: '' } : {}) })
                  }
                  className="form-select"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BOOKED">Booked</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>

            {formData.status === 'MAINTENANCE' && (
              <div>
                <label className="form-label">Repair / work type (optional)</label>
                <p className="text-xs text-slate-500 mb-2">What is under repair? e.g. Electronics, AC, Fans, Carpenter</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {MAINTENANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addMaintenancePreset(preset)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.maintenanceReason}
                  onChange={(e) => setFormData({ ...formData, maintenanceReason: e.target.value })}
                  className="form-input"
                  placeholder="e.g. AC, Fans, Carpenter, Electronics"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-sm px-4 py-2"
              >
                <span>{room ? 'Update Room' : 'Create Room'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
