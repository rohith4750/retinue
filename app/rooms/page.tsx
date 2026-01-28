'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaHome, FaEdit, FaTrash, FaPlus, FaCalendarAlt, FaClock, FaFilter } from 'react-icons/fa'
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

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
  }, [])

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

        {filteredRooms && filteredRooms.length > 0 ? (
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
        ) : (
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
