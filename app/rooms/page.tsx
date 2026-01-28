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

export default function RoomsPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [filterCheckIn, setFilterCheckIn] = useState('')
  const [filterCheckOut, setFilterCheckOut] = useState('')
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
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
  const [calendarPage, setCalendarPage] = useState(0)
  const ROOMS_PER_PAGE = 10

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
  }, [])

  // Fetch bookings for calendar view
  const { data: bookingsData } = useQuery({
    queryKey: ['bookings-calendar', calendarStartDate.toISOString()],
    queryFn: () => api.get('/bookings?limit=500'),
    enabled: viewMode === 'calendar',
    staleTime: 0,
  })
  
  const bookings = bookingsData?.data || bookingsData || []

  // Generate 7 days for calendar
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(calendarStartDate)
    date.setDate(date.getDate() + i)
    return date
  })

  // Check if a room is booked on a specific date
  const getRoomBookingForDate = (roomId: string, date: Date) => {
    const dateStart = new Date(date)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(date)
    dateEnd.setHours(23, 59, 59, 999)
    
    return bookings.find((booking: any) => {
      if (booking.room?.id !== roomId) return false
      if (booking.status === 'CANCELLED') return false
      const checkIn = new Date(booking.checkIn)
      const checkOut = new Date(booking.checkOut)
      // Check if booking overlaps with this date
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

  // Fetch rooms - either all rooms or available rooms based on date/time
  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ['rooms', debouncedSearch, filterCheckIn, filterCheckOut, isCheckingAvailability],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      // If checking availability with date/time, use the available endpoint
      if (isCheckingAvailability && filterCheckIn && filterCheckOut) {
        const checkInDate = new Date(filterCheckIn).toISOString()
        const checkOutDate = new Date(filterCheckOut).toISOString()
        return api.get(`/rooms/available?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}`)
      }
      return api.get(`/rooms?${params.toString()}`)
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: 'always',
  })

  // Extract rooms array from response (handles both /rooms and /rooms/available responses)
  const roomsData = rooms?.rooms || rooms || []

  const handleCheckAvailability = () => {
    if (filterCheckIn && filterCheckOut) {
      setIsCheckingAvailability(true)
      refetch()
    }
  }

  const handleClearFilter = () => {
    setFilterCheckIn('')
    setFilterCheckOut('')
    setIsCheckingAvailability(false)
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

  // Get unique floors for filter
  const uniqueFloors = Array.from(new Set(filteredRooms.map((r: any) => r.floor))).sort((a: any, b: any) => a - b)

  // Filter rooms for calendar by floor
  const calendarFilteredRooms = calendarFloorFilter === 'all' 
    ? filteredRooms 
    : filteredRooms.filter((r: any) => r.floor === parseInt(calendarFloorFilter))

  // Paginate rooms for calendar
  const totalCalendarPages = Math.ceil(calendarFilteredRooms.length / ROOMS_PER_PAGE)
  const paginatedCalendarRooms = calendarFilteredRooms.slice(
    calendarPage * ROOMS_PER_PAGE,
    (calendarPage + 1) * ROOMS_PER_PAGE
  )

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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                isCheckingAvailability 
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FaList className="w-3 h-3" />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'calendar' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
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
              {/* Check-in Date & Time */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  <FaCalendarAlt className="inline w-3 h-3 mr-1" />
                  Check-in Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={filterCheckIn}
                  onChange={(e) => {
                    setFilterCheckIn(e.target.value)
                    // Auto-set checkout to next day same time if empty
                    if (!filterCheckOut && e.target.value) {
                      const checkIn = new Date(e.target.value)
                      checkIn.setDate(checkIn.getDate() + 1)
                      const formatted = checkIn.toISOString().slice(0, 16)
                      setFilterCheckOut(formatted)
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Check-out Date & Time */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  <FaClock className="inline w-3 h-3 mr-1" />
                  Check-out Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={filterCheckOut}
                  min={filterCheckIn}
                  onChange={(e) => setFilterCheckOut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              {/* Apply Filter Button */}
              <button
                onClick={handleCheckAvailability}
                disabled={!filterCheckIn || !filterCheckOut}
                className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check Availability
              </button>
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

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-slate-800/60 rounded-xl border border-white/10 overflow-hidden mb-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateCalendar('prev')}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {calendarStartDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={goToToday}
                    className="px-2 py-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 rounded border border-sky-500/30"
                  >
                    Today
                  </button>
                </div>
                <button
                  onClick={() => navigateCalendar('next')}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              {/* Floor Filter & Room Count */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {calendarFilteredRooms.length} rooms
                </span>
                <select
                  value={calendarFloorFilter}
                  onChange={(e) => { setCalendarFloorFilter(e.target.value); setCalendarPage(0) }}
                  className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:border-sky-500 outline-none"
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
                  <tr className="bg-slate-900/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-32 sticky left-0 bg-slate-800/90 z-10">Room</th>
                    {calendarDays.map((date, i) => {
                      const isToday = date.toDateString() === new Date().toDateString()
                      return (
                        <th key={i} className={`px-2 py-3 text-center min-w-[100px] ${isToday ? 'bg-sky-500/10' : ''}`}>
                          <div className={`text-[10px] uppercase tracking-wider ${isToday ? 'text-sky-400' : 'text-slate-500'}`}>
                            {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </div>
                          <div className={`text-sm font-bold ${isToday ? 'text-sky-400' : 'text-slate-300'}`}>
                            {date.getDate()}
                          </div>
                          <div className={`text-[10px] ${isToday ? 'text-sky-400' : 'text-slate-500'}`}>
                            {date.toLocaleDateString('en-IN', { month: 'short' })}
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCalendarRooms.map((room: any) => (
                    <tr key={room.id} className="border-t border-white/5 hover:bg-slate-700/20">
                      <td className="px-4 py-2 sticky left-0 bg-slate-800/90 z-10">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                            room.status === 'BOOKED' ? 'bg-red-400' :
                            room.status === 'MAINTENANCE' ? 'bg-amber-400' : 'bg-slate-400'
                          }`} />
                          <div>
                            <p className="text-sm font-semibold text-white">{room.roomNumber}</p>
                            <p className="text-[10px] text-slate-500">{room.roomType} • F{room.floor}</p>
                          </div>
                        </div>
                      </td>
                      {calendarDays.map((date, i) => {
                        const booking = getRoomBookingForDate(room.id, date)
                        const isToday = date.toDateString() === new Date().toDateString()
                        return (
                          <td key={i} className={`px-1 py-1 ${isToday ? 'bg-sky-500/5' : ''}`}>
                            {booking ? (
                              <div 
                                className={`px-2 py-1.5 rounded-lg text-center cursor-pointer transition-all hover:scale-[1.02] ${
                                  booking.status === 'CHECKED_IN' ? 'bg-sky-500/30 border border-sky-500/50' :
                                  booking.status === 'CONFIRMED' ? 'bg-emerald-500/30 border border-emerald-500/50' :
                                  'bg-amber-500/30 border border-amber-500/50'
                                }`}
                                title={`${booking.guest?.name || 'Guest'} - ${booking.status}`}
                              >
                                <p className={`text-[10px] font-semibold truncate ${
                                  booking.status === 'CHECKED_IN' ? 'text-sky-300' :
                                  booking.status === 'CONFIRMED' ? 'text-emerald-300' :
                                  'text-amber-300'
                                }`}>
                                  {booking.guest?.name?.split(' ')[0] || 'Guest'}
                                </p>
                                <p className={`text-[8px] ${
                                  booking.status === 'CHECKED_IN' ? 'text-sky-400' :
                                  booking.status === 'CONFIRMED' ? 'text-emerald-400' :
                                  'text-amber-400'
                                }`}>
                                  {booking.status === 'CHECKED_IN' ? 'In' : booking.status === 'CONFIRMED' ? 'Conf' : 'Pend'}
                                </p>
                              </div>
                            ) : (
                              <div className="px-2 py-1.5 rounded-lg text-center bg-slate-700/20 border border-slate-700/30">
                                <p className="text-[10px] text-slate-500">-</p>
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

            {/* Legend & Pagination */}
            <div className="px-4 py-3 bg-slate-900/30 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                  <span className="text-slate-400">Confirmed</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-sky-500/30 border border-sky-500/50" />
                  <span className="text-slate-400">Checked In</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
                  <span className="text-slate-400">Pending</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded bg-slate-700/30 border border-slate-700/50" />
                  <span className="text-slate-400">Available</span>
                </div>
              </div>
              
              {/* Pagination */}
              {totalCalendarPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarPage(p => Math.max(0, p - 1))}
                    disabled={calendarPage === 0}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-slate-400">
                    {calendarPage + 1} / {totalCalendarPages}
                  </span>
                  <button
                    onClick={() => setCalendarPage(p => Math.min(totalCalendarPages - 1, p + 1))}
                    disabled={calendarPage >= totalCalendarPages - 1}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredRooms && filteredRooms.length > 0 ? (
          <div className="flex flex-col">
            {/* Group rooms into pairs and render with divider lines */}
            {Array.from({ length: Math.ceil(filteredRooms.length / 2) }, (_, rowIndex) => {
              const roomsInRow = filteredRooms.slice(rowIndex * 2, rowIndex * 2 + 2)
              const isLastRow = rowIndex === Math.ceil(filteredRooms.length / 2) - 1
              return (
                <div key={rowIndex}>
                  {/* Row with 2 chips */}
                  <div className="flex flex-wrap gap-4 py-3">
                    {roomsInRow.map((room: any) => (
                      <div
                        key={room.id}
                        className={`inline-flex items-center px-4 py-2.5 rounded-full border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                          room.status === 'AVAILABLE' 
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
                        {/* Room Number */}
                        <span className={`text-sm font-bold ${
                          room.status === 'AVAILABLE' ? 'text-emerald-300' :
                          room.status === 'BOOKED' ? 'text-red-300' :
                          'text-yellow-300'
                        }`}>{room.roomNumber}</span>
                        
                        {/* Divider */}
                        <span className={`w-px h-5 mx-3 ${
                          room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          room.status === 'BOOKED' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`}></span>
                        
                        {/* Type */}
                        <span className="text-xs text-slate-300 uppercase">{room.roomType}</span>
                        
                        {/* Divider */}
                        <span className={`w-px h-5 mx-3 ${
                          room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          room.status === 'BOOKED' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`}></span>
                        
                        {/* Price */}
                        <span className="text-sm font-semibold text-white">₹{room.basePrice.toLocaleString()}</span>
                        
                        {/* Divider */}
                        <span className={`w-px h-5 mx-3 ${
                          room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          room.status === 'BOOKED' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`}></span>
                        
                        {/* Status Text */}
                        <span className={`text-[10px] font-semibold uppercase ${
                          room.status === 'AVAILABLE' ? 'text-emerald-400' :
                          room.status === 'BOOKED' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>{room.status}</span>

                        {/* Delete Button - only show for admins */}
                        {canManageRooms && (
                          <>
                            <span className={`w-px h-5 mx-3 ${
                              room.status === 'AVAILABLE' ? 'bg-emerald-400' :
                              room.status === 'BOOKED' ? 'bg-red-400' :
                              'bg-yellow-400'
                            }`}></span>
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
                  {/* Divider line after each row (except last) */}
                  {!isLastRow && (
                    <div className="border-b border-slate-700/50"></div>
                  )}
                </div>
              )
            })}
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

function RoomModal({ room, onClose }: { room: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || '',
    roomType: room?.roomType || 'SINGLE',
    floor: room?.floor || '',
    basePrice: room?.basePrice || '',
    capacity: room?.capacity || '',
    status: room?.status || 'AVAILABLE',
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
    if (room) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
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
                  <option value="SUITE">Suite</option>
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
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="BOOKED">Booked</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
            
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
