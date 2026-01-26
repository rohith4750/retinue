'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaHome, FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'

export default function RoomsPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean
    roomId: string | null
  }>({
    show: false,
    roomId: null,
  })

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    } else {
      setCurrentUser(JSON.parse(user))
    }
  }, [router])

  // Check if user can manage rooms (ADMIN or SUPER_ADMIN only)
  const canManageRooms = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  const queryClient = useQueryClient()

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      return api.get(`/rooms?${params.toString()}`)
    },
  })

  // Filter rooms client-side if needed (for additional filtering)
  const filteredRooms = rooms?.filter((room: any) => {
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
      <div className="min-h-screen relative flex">
        <Navbar />
        <div className="flex-1 lg:ml-64 flex items-center justify-center h-96">
          <div className="text-slate-300 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex">
      <Navbar />
      <div className="flex-1 lg:ml-64">
        <div className="glow-sky top-20 right-20"></div>
        <div className="glow-emerald bottom-20 left-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Room Management</h1>
            <p className="text-sm text-slate-400">
              {canManageRooms ? 'Manage rooms, availability, and pricing' : 'View rooms and availability'}
            </p>
          </div>
          {canManageRooms && (
            <button
              onClick={() => {
                setEditingRoom(null)
                setShowModal(true)
              }}
              className="btn-primary flex items-center space-x-1.5 text-sm px-4 py-2"
            >
              <FaPlus className="w-3.5 h-3.5" />
              <span>Add Room</span>
            </button>
          )}
        </div>

        <div className="mb-4">
          <SearchInput
            placeholder="Search by room number, type, or status..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-md"
          />
        </div>

        {filteredRooms && filteredRooms.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredRooms.map((room: any) => (
              <div
                key={room.id}
                className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-[0_18px_60px_rgba(15,23,42,0.9)] p-4 border border-white/5 relative overflow-hidden group hover:scale-105 transition-transform duration-200"
              >
                <div className="mb-3 relative z-10">
                  <div className="flex items-center space-x-1.5 mb-2">
                    <FaHome className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <h3 className="text-base font-bold text-slate-100 truncate flex-1">
                      Room {room.roomNumber}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge badge-info text-[10px] px-2 py-0.5">{room.roomType}</span>
                    <span className={`badge ${
                      room.status === 'AVAILABLE' ? 'badge-success' :
                      room.status === 'BOOKED' ? 'badge-danger' :
                      'badge-warning'
                    } text-[10px] px-2 py-0.5 flex-shrink-0`}>
                      {room.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-3 relative z-10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Floor</span>
                    <span className="text-slate-300 font-medium text-xs">F{room.floor}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Capacity</span>
                    <span className="text-slate-300 font-medium text-xs">{room.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                    <span className="text-slate-500 text-xs">Price</span>
                    <span className="text-base font-bold text-sky-400">₹{room.basePrice.toLocaleString()}</span>
                  </div>
                </div>

                {canManageRooms && (
                  <div className="flex items-center space-x-1.5 pt-2.5 border-t border-white/5 relative z-10">
                    <button
                      onClick={() => {
                        setEditingRoom(room)
                        setShowModal(true)
                      }}
                      className="flex-1 text-sky-400 hover:text-sky-300 font-medium text-xs px-2 py-1.5 rounded-lg hover:bg-sky-500/10 transition-colors border border-sky-500/20 flex items-center justify-center space-x-1"
                    >
                      <FaEdit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="flex-1 text-red-400 hover:text-red-300 font-medium text-xs px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-red-500/20 flex items-center justify-center space-x-1"
                    >
                      <FaTrash className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
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
      </div>
    </div>
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
