'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
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
                <div key={category} className="space-y-6">
                  <div className="floor-layer-header">
                    <h3 className="flex items-center gap-4">
                      <span>{category.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium text-sky-400 opacity-60 uppercase tracking-widest leading-none">
                        {categoryRooms.length} Spaces
                      </span>
                    </h3>
                  </div>
                  <div className="perspective-1000 pb-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-12 gap-y-16">
                      {categoryRooms.map((room: any) => (
                        <div
                          key={room.id}
                          className="relative group preserve-3d isometric-card cursor-pointer h-44"
                          onClick={() => {
                            if (canManageRooms) {
                              setEditingRoom(room)
                              setShowModal(true)
                            }
                          }}
                        >
                          <div className="room-slab-side-right" />
                          <div className="room-slab-side-bottom" />
                          <div className={`room-slab-top p-5 flex flex-col justify-between transition-all duration-500 ${
                            room.status === 'AVAILABLE' ? 'glow-available' :
                            room.status === 'BOOKED' ? 'glow-booked' :
                            'shadow-amber-500/10'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-0.5">Room</span>
                                <p className="text-2xl font-black text-white leading-none">{room.roomNumber}</p>
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border shadow-sm ${
                                room.status === 'AVAILABLE' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                                room.status === 'BOOKED' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                'bg-amber-500/20 border-amber-500/50 text-amber-400'
                              }`}>
                                {room.status}
                              </div>
                            </div>
                            
                            <div className="flex items-end justify-between mt-auto">
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{room.roomType}</p>
                                <p className="text-2xl font-black text-white leading-none">₹{room.basePrice?.toLocaleString()}</p>
                              </div>
                              {canManageRooms && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingRoom(room)
                                      setShowModal(true)
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-sky-600/80 text-white hover:bg-sky-500 rounded-full border border-white/10 transition-all hover:scale-110"
                                  >
                                    <FaEdit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(room.id)
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-red-600/80 text-white hover:bg-red-500 rounded-full border border-white/10 transition-all hover:scale-110"
                                  >
                                    <FaTrash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
