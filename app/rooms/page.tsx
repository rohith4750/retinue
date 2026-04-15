'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import moment from 'moment'
import { FaHome, FaEdit, FaTrash, FaPlus, FaCalendarAlt, FaClock, FaFilter, FaList, FaChevronLeft, FaChevronRight, FaDoorOpen, FaCheckCircle, FaMoneyBillWave } from 'react-icons/fa'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'

function formatDateTimeLocal(date: any) {
  return moment(date).format('YYYY-MM-DDTHH:mm')
}

function getDefaultAvailabilityWindow() {
  const now = moment().seconds(0).milliseconds(0)
  const nextDay = moment(now).add(1, 'day')
  return {
    checkIn: formatDateTimeLocal(now),
    checkOut: formatDateTimeLocal(nextDay),
  }
}

function getStartOfTodayLocal() {
  return moment().startOf('day').format('YYYY-MM-DDTHH:mm')
}

function getCheckOutPlus24h(checkInLocal: string) {
  const m = moment(checkInLocal)
  if (!m.isValid()) return ''
  return formatDateTimeLocal(m.add(1, 'day'))
}

export default function RoomsPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [timelineRoom, setTimelineRoom] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [filterCheckIn, setFilterCheckIn] = useState(() => getDefaultAvailabilityWindow().checkIn)
  const [filterCheckOut, setFilterCheckOut] = useState(() => getDefaultAvailabilityWindow().checkOut)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    roomId: string | null
  }>({
    show: false,
    roomId: null,
  })

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    return moment().startOf('day')
  })
  const [calendarFloorFilter, setCalendarFloorFilter] = useState<string>('all')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
  }, [])

  const calendarEndDate = moment(calendarStartDate).add(8, 'days')

  const { data: bookingsResponse } = useQuery({
    queryKey: ['bookings-calendar', calendarStartDate.toISOString()],
    queryFn: () => {
      const from = calendarStartDate.toISOString()
      const to = calendarEndDate.toISOString()
      return api.get(`/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&forCalendar=1&limit=1000`)
    },
    staleTime: 0,
  })

  const bookings = Array.isArray(bookingsResponse?.data)
    ? bookingsResponse.data
    : Array.isArray(bookingsResponse)
      ? bookingsResponse
      : []

  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    return moment(calendarStartDate).add(i, 'days')
  })

  const getBookingDisplayStatusForDate = (booking: any, date: any) => {
    if (!booking) return null
    if (booking.status !== 'CHECKED_IN') return booking.status
    return moment(date).isSame(moment(), 'day') ? 'CHECKED_IN' : 'CONFIRMED'
  }

  const getRoomBookingForDate = (roomId: string, date: any) => {
    const dateStart = moment(date).startOf('day')
    const dateEnd = moment(date).endOf('day')

    return bookings.find((booking: any) => {
      const bookingRoomId = booking.room?.id ?? booking.roomId
      if (bookingRoomId !== roomId) return false
      if (booking.status === 'CANCELLED' || booking.status === 'CHECKED_OUT') return false
      const checkIn = moment(booking.checkIn)
      const checkOut = moment(booking.checkOut)
      return checkIn.isBefore(dateEnd) && checkOut.isAfter(dateStart)
    })
  }

  const navigateCalendar = (direction: 'prev' | 'next') => {
    setCalendarStartDate(prev => {
      return moment(prev).add(direction === 'next' ? 7 : -7, 'days')
    })
  }

  const goToToday = () => {
    setCalendarStartDate(moment().startOf('day'))
  }

  const canManageRooms = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  const queryClient = useQueryClient()

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', debouncedSearch, filterCheckIn, filterCheckOut, isCheckingAvailability],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      if (isCheckingAvailability && filterCheckIn && filterCheckOut) {
        const checkInDate = moment(filterCheckIn).toISOString()
        const checkOutDate = moment(filterCheckOut).toISOString()
        return api.get(`/rooms/available?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}`)
      }
      return api.get(`/rooms?${params.toString()}`)
    },
    staleTime: 0,
  })

  const roomsData = rooms?.rooms || rooms || []

  const handleClearFilter = () => {
    const defaultWindow = getDefaultAvailabilityWindow()
    setFilterCheckIn(defaultWindow.checkIn)
    setFilterCheckOut(defaultWindow.checkOut)
    setIsCheckingAvailability(true)
    setShowDateFilter(false)
  }

  const filteredRooms = roomsData?.filter((room: any) => {
    if (!debouncedSearch) return true
    const search = debouncedSearch.toLowerCase()
    return (
      room.roomNumber.toLowerCase().includes(search) ||
      room.roomType.toLowerCase().includes(search) ||
      room.status.toLowerCase().includes(search)
    )
  }) || []

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

  const uniqueFloors = Array.from(new Set(filteredRooms.map((r: any) => r.floor))).sort((a: any, b: any) => a - b)

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
      <div className="w-full px-2 lg:px-6 py-2 md:py-4 relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
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
              <span className="text-sm">Filter</span>
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
                Clear
              </button>
            )}

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
                Grid
              </button>
            </div>
          </div>

          {canManageRooms && (
            <button
              onClick={() => {
                setEditingRoom(null)
                setShowModal(true)
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors shadow-lg shadow-sky-900/20"
            >
              <FaPlus className="w-3 h-3" />
              <span>Add Room</span>
            </button>
          )}
        </div>

        {showDateFilter && (
          <div className="mb-4 p-4 bg-slate-800/60 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  <FaCalendarAlt className="inline w-3 h-3 mr-1" />
                  Availability Check
                </label>
                <input
                  type="datetime-local"
                  value={filterCheckIn}
                  min={getStartOfTodayLocal()}
                  onChange={(e) => {
                    const min = getStartOfTodayLocal()
                    const nextValue = e.target.value && e.target.value < min ? min : e.target.value
                    setFilterCheckIn(nextValue)
                    if (nextValue) {
                      setFilterCheckOut(getCheckOutPlus24h(nextValue))
                    } else {
                      setFilterCheckOut('')
                    }
                    setIsCheckingAvailability(true)
                  }}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="rounded-2xl border border-white/10 overflow-hidden mb-4 bg-gradient-to-b from-slate-800/80 to-slate-900/80 shadow-xl">
            {calendarRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <FaCalendarAlt className="w-14 h-14 text-slate-500 mb-4" />
                <p className="text-base font-semibold text-slate-300 mb-1">No rooms</p>
              </div>
            ) : (
              <div className="overflow-x-auto sidebar-scrollbar">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 w-36 sticky left-0 bg-slate-800/95 z-10 border-r border-white/5">Room</th>
                      {calendarDays.map((date, i) => (
                        <th key={i} className={`px-2 py-3 text-center min-w-[110px] border-r border-white/5 ${date.isSame(moment(), 'day') ? 'bg-sky-500/15' : ''}`}>
                          <div className="text-[10px] uppercase text-slate-500">{date.format('ddd')}</div>
                          <div className="text-lg font-bold text-white">{date.date()}</div>
                          <div className="text-[10px] text-slate-500">{date.format('MMM')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarRooms.map((room: any) => (
                      <tr key={room.id} className="border-t border-white/5 hover:bg-slate-700/10">
                        <td className="px-3 py-2 sticky left-0 bg-slate-800/95 z-10 border-r border-white/5">
                          <p className="text-sm font-bold text-white mb-0.5">{room.roomNumber}</p>
                          <p className="text-[10px] text-slate-500">{room.roomType}</p>
                        </td>
                        {calendarDays.map((date, i) => {
                          const booking = getRoomBookingForDate(room.id, date)
                          const displayStatus = booking ? getBookingDisplayStatusForDate(booking, date) : null
                          return (
                            <td key={i} className="px-1 py-1 border-r border-white/5">
                              {booking ? (
                                <div className={`px-1 py-2 rounded text-center text-[10px] font-bold ${
                                  displayStatus === 'CHECKED_IN' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {booking.guest?.name?.split(' ')[0] || 'Booked'}
                                </div>
                              ) : (
                                <div className="py-2 text-center text-[10px] text-slate-600">Free</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-8">
            {roomsByCategory.length > 0 ? (
              roomsByCategory.map(({ category, rooms: categoryRooms }) => (
                <div key={category} className="space-y-6 mb-10">
                  <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                      {category.replace(/_/g, ' ')}
                    </h3>
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-sky-400 uppercase tracking-wider border border-white/5 shadow-inner">
                      {categoryRooms.length} {categoryRooms.length === 1 ? 'Room' : 'Rooms'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {categoryRooms.map((room: any) => (
                      <div
                        key={room.id}
                        className={`relative group cursor-pointer min-h-[11rem] h-auto rounded-2xl bg-slate-900/60 border backdrop-blur-md overflow-hidden flex flex-col justify-between p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
                          room.status === 'AVAILABLE' ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-500/5' :
                          room.status === 'BOOKED' ? 'border-red-500/30 hover:border-red-500/60 shadow-red-500/5' :
                          'border-amber-500/30 hover:border-amber-500/60 shadow-amber-500/5'
                        }`}
                        onClick={() => setTimelineRoom(room)}
                      >
                        {/* Status Gradient Background */}
                        <div className={`absolute inset-0 opacity-10 transition-opacity duration-300 group-hover:opacity-20 ${
                          room.status === 'AVAILABLE' ? 'bg-gradient-to-br from-emerald-500 to-transparent' :
                          room.status === 'BOOKED' ? 'bg-gradient-to-br from-red-500 to-transparent' :
                          'bg-gradient-to-br from-amber-500 to-transparent'
                        }`} />

                        <div className="relative z-10 flex justify-between items-start">
                          <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Room</span>
                            <p className="text-2xl font-black text-white leading-none">{room.roomNumber}</p>
                          </div>
                          <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm backdrop-blur-md ${
                            room.status === 'AVAILABLE' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            room.status === 'BOOKED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {room.status}
                          </div>
                        </div>
                        
                        <div className="relative z-10 flex items-end justify-between mt-auto pt-4">
                          <div className="space-y-1 w-full">
                            <div className="flex justify-between items-end w-full">
                              <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{room.roomType}</p>
                                <p className="text-xl font-black text-white leading-none mt-1">₹{room.basePrice?.toLocaleString()}</p>
                              </div>
                            </div>
                            
                            {room.status === 'BOOKED' && room.currentBooking && (
                              <div className="pt-2 mt-2 border-t border-white/5 flex flex-col">
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Booked By</span>
                                <span className="text-xs font-bold text-red-300 truncate w-full pr-8">{room.currentBooking.guestName}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">{moment(room.currentBooking.checkInAt).format('MMM D')} - {moment(room.currentBooking.checkOutAt).format('MMM D')}</span>
                              </div>
                            )}
                          </div>
                          {canManageRooms && (
                            <div className="flex gap-2 absolute bottom-0 right-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingRoom(room)
                                  setShowModal(true)
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-slate-800 text-sky-400 hover:bg-sky-500 hover:text-white rounded-full border border-sky-500/30 transition-all hover:scale-110 shadow-lg"
                              >
                                <FaEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(room.id)
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white rounded-full border border-red-500/30 transition-all hover:scale-110 shadow-lg"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="card text-center py-20 bg-slate-900/40 border border-white/5 rounded-2xl">
                <FaHome className="text-5xl mx-auto mb-4 text-slate-700" />
                <p className="text-xl font-bold text-slate-400">No rooms found matching your search</p>
              </div>
            )}
          </div>
        )}

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
          message="Are you sure you want to delete this room?"
          action="Delete"
          type="delete"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmModal({ show: false, roomId: null })}
          isLoading={deleteMutation.isPending}
          confirmText="Delete Room"
        />

        {timelineRoom && (
          <RoomBookingsModal
            room={timelineRoom}
            onClose={() => setTimelineRoom(null)}
          />
        )}
      </div>
    </>
  )
}

const MAINTENANCE_PRESETS = ['Electronics', 'AC', 'Fans', 'Carpenter', 'Plumbing', 'Painting', 'Other']

function RoomModal({ room, onClose }: { room: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || '',
    roomType: room?.roomType || 'STANDARD',
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
      toast.success('Room created')
    },
    onError: () => toast.error('Creation failed'),
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/rooms/${room.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      onClose()
      toast.success('Room updated')
    },
    onError: () => toast.error('Update failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (room) updateMutation.mutate(formData)
    else createMutation.mutate(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
          {room ? <FaEdit className="text-sky-500" /> : <FaPlus className="text-sky-500" />}
          {room ? `Edit Room ${room.roomNumber}` : 'Add New Room'}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Room Number</label>
            <input
              type="text"
              required
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-sky-500 transition-colors"
              value={formData.roomNumber}
              onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Category</label>
            <select
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-sky-500 transition-colors"
              value={formData.roomType}
              onChange={e => setFormData({ ...formData, roomType: e.target.value })}
            >
              <option value="STANDARD">Standard</option>
              <option value="SUITE">Suite</option>
              <option value="SUITE_PLUS">Suite+</option>
            </select>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Floor</label>
            <input
              type="number"
              required
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-sky-500 transition-colors"
              value={formData.floor}
              onChange={e => setFormData({ ...formData, floor: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Base Price</label>
            <input
              type="number"
              required
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-sky-500 transition-colors"
              value={formData.basePrice}
              onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-colors uppercase tracking-widest text-xs">Cancel</button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 transition-all uppercase tracking-widest text-xs shadow-lg shadow-sky-900/20">
              {room ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RoomBookingsModal({ room, onClose }: { room: any; onClose: () => void }) {
  const currentMonthStart = moment().startOf('month').toISOString()
  const currentMonthEnd = moment().endOf('month').toISOString()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['room-bookings', room.id, currentMonthStart],
    queryFn: () => api.get(`/bookings?roomId=${room.id}&from=${encodeURIComponent(currentMonthStart)}&to=${encodeURIComponent(currentMonthEnd)}&limit=100`),
  })

  // /api/bookings returns { data: [...], pagination: {...}, summary: {...} }
  const bookings = data?.data || []
  
  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl overflow-hidden p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <FaCalendarAlt className="text-sky-500" />
            <div className="flex flex-col">
               <span>Timeline for Room {room.roomNumber}</span>
               <span className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{moment().format('MMMM YYYY')}</span>
            </div>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition">×</button>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : bookings.length === 0 ? (
           <div className="text-center py-16 bg-slate-800/20 border border-white/5 rounded-xl">
             <FaCalendarAlt className="text-4xl text-slate-600 mb-4 mx-auto" />
             <p className="text-slate-400 font-medium text-lg">No bookings for this month.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-500 bg-slate-900">
                   <th className="p-4 font-black">Guest</th>
                   <th className="p-4 font-black">Check In</th>
                   <th className="p-4 font-black">Check Out</th>
                   <th className="p-4 font-black">Status</th>
                   <th className="p-4 text-right font-black">Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {bookings.map((b: any) => (
                   <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                     <td className="p-4">
                       <p className="font-bold text-white text-base">{b.guest?.name || 'Guest'}</p>
                       <p className="text-xs text-slate-400 mt-0.5">{b.guest?.phone}</p>
                     </td>
                     <td className="p-4 text-sm text-slate-300 font-medium">{moment(b.checkIn).format('MMM DD, YYYY')}</td>
                     <td className="p-4 text-sm text-slate-300 font-medium">{moment(b.checkOut).format('MMM DD, YYYY')}</td>
                     <td className="p-4">
                       <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wider ${
                         b.status === 'CHECKED_IN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                         b.status === 'CONFIRMED' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' :
                         b.status === 'CHECKED_OUT' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30' :
                         'bg-red-500/10 text-red-400 border border-red-500/30'
                       }`}>{b.status}</span>
                     </td>
                     <td className="p-4 text-right">
                        <strong className="text-white text-base">₹{b.totalAmount.toLocaleString()}</strong>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

