'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaUsers, FaBuilding } from 'react-icons/fa'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import Link from 'next/link'

export default function FunctionHallsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [showModal, setShowModal] = useState(false)
  const [editingHall, setEditingHall] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; hallId: string | null }>({
    show: false,
    hallId: null
  })
  const [selectedDate, setSelectedDate] = useState('')
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)

  // Check user role
  const [user, setUser] = useState<any>(null)
  useState(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  })
  const canManageHalls = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  // Fetch function halls
  const { data: hallsData, isLoading } = useQuery({
    queryKey: ['function-halls', debouncedSearch, selectedDate, isCheckingAvailability],
    queryFn: () => {
      if (isCheckingAvailability && selectedDate) {
        return api.get(`/function-halls/available?date=${encodeURIComponent(selectedDate)}`)
      }
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('search', debouncedSearch)
      return api.get(`/function-halls?${params.toString()}`)
    }
  })

  const halls = isCheckingAvailability ? (hallsData?.halls || []) : (hallsData || [])

  // Create/Update mutation
  const saveMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => {
      if (editingHall) {
        return api.put(`/function-halls/${editingHall.id}`, data)
      }
      return api.post('/function-halls', data)
    },
    endpoint: '/function-halls',
    onSuccess: () => {
      setShowModal(false)
      setEditingHall(null)
      toast.success(editingHall ? 'Hall updated successfully' : 'Hall created successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save hall')
    }
  })

  // Delete mutation
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/function-halls/${id}`),
    endpoint: '/function-halls',
    onSuccess: () => {
      setDeleteModal({ show: false, hallId: null })
      toast.success('Hall deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete hall')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      capacity: formData.get('capacity'),
      pricePerDay: formData.get('pricePerDay'),
      pricePerHour: formData.get('pricePerHour') || null,
      amenities: formData.get('amenities'),
      description: formData.get('description'),
    }
    saveMutation.mutate(data)
  }

  const handleClearDate = () => {
    setSelectedDate('')
    setIsCheckingAvailability(false)
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-800/50 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          {/* Left: Search and Date Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search halls..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-48"
            />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg border border-white/5">
              <FaCalendarAlt className="w-3.5 h-3.5 text-sky-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  if (e.target.value) {
                    setIsCheckingAvailability(true)
                  }
                }}
                className="bg-transparent text-sm text-slate-200 border-none outline-none w-32"
              />
            </div>
            {isCheckingAvailability && (
              <button
                onClick={handleClearDate}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                Clear
              </button>
            )}
            {isCheckingAvailability && selectedDate && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                {halls.length} available
              </span>
            )}
          </div>

          {/* Right: Add Hall button */}
          <div className="flex items-center gap-2">
            <Link
              href="/function-halls/bookings"
              className="flex items-center space-x-2 px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <FaCalendarAlt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bookings</span>
            </Link>
            {canManageHalls && (
              <button
                onClick={() => {
                  setEditingHall(null)
                  setShowModal(true)
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                <span>Add Hall</span>
              </button>
            )}
          </div>
        </div>

        {/* Halls List */}
        {halls && halls.length > 0 ? (
          <div className="flex flex-col">
            {halls.map((hall: any, index: number) => (
              <div key={hall.id}>
                <div className="flex items-center justify-between py-4">
                  <div
                    className={`inline-flex items-center px-4 py-2.5 rounded-full border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                      hall.status === 'AVAILABLE'
                        ? 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30'
                        : hall.status === 'BOOKED'
                        ? 'bg-red-500/20 border-red-500 hover:bg-red-500/30'
                        : 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30'
                    }`}
                    onClick={() => {
                      if (canManageHalls) {
                        setEditingHall(hall)
                        setShowModal(true)
                      }
                    }}
                  >
                    {/* Hall Name */}
                    <FaBuilding className={`w-4 h-4 mr-2 ${
                      hall.status === 'AVAILABLE' ? 'text-emerald-400' :
                      hall.status === 'BOOKED' ? 'text-red-400' :
                      'text-yellow-400'
                    }`} />
                    <span className={`text-sm font-bold ${
                      hall.status === 'AVAILABLE' ? 'text-emerald-300' :
                      hall.status === 'BOOKED' ? 'text-red-300' :
                      'text-yellow-300'
                    }`}>{hall.name}</span>
                    
                    {/* Divider */}
                    <span className={`w-px h-5 mx-3 ${
                      hall.status === 'AVAILABLE' ? 'bg-emerald-400' :
                      hall.status === 'BOOKED' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`}></span>
                    
                    {/* Capacity */}
                    <FaUsers className="w-3 h-3 mr-1 text-slate-400" />
                    <span className="text-xs text-slate-300">{hall.capacity} guests</span>
                    
                    {/* Divider */}
                    <span className={`w-px h-5 mx-3 ${
                      hall.status === 'AVAILABLE' ? 'bg-emerald-400' :
                      hall.status === 'BOOKED' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`}></span>
                    
                    {/* Price */}
                    <span className="text-sm font-semibold text-white">₹{hall.pricePerDay.toLocaleString()}/day</span>
                    
                    {/* Divider */}
                    <span className={`w-px h-5 mx-3 ${
                      hall.status === 'AVAILABLE' ? 'bg-emerald-400' :
                      hall.status === 'BOOKED' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`}></span>
                    
                    {/* Status */}
                    <span className={`text-[10px] font-semibold uppercase ${
                      hall.status === 'AVAILABLE' ? 'text-emerald-400' :
                      hall.status === 'BOOKED' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>{hall.status}</span>

                    {/* Delete Button */}
                    {canManageHalls && (
                      <>
                        <span className={`w-px h-5 mx-3 ${
                          hall.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          hall.status === 'BOOKED' ? 'bg-red-400' :
                          'bg-yellow-400'
                        }`}></span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteModal({ show: true, hallId: hall.id })
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors rounded-full hover:bg-red-500/30"
                          title="Delete"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Book Now button */}
                  {hall.status === 'AVAILABLE' && (
                    <Link
                      href={`/function-halls/bookings/new?hallId=${hall.id}${selectedDate ? `&date=${selectedDate}` : ''}`}
                      className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
                    >
                      Book Now
                    </Link>
                  )}
                </div>
                {index < halls.length - 1 && (
                  <div className="border-b border-slate-700/50"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="flex flex-col items-center">
              <FaBuilding className="text-4xl mb-3 text-slate-500" />
              <p className="text-base font-semibold text-slate-300 mb-1.5">No function halls found</p>
              {canManageHalls && (
                <>
                  <p className="text-xs text-slate-500 mb-4">Click "Add Hall" to create your first function hall</p>
                  <button
                    onClick={() => {
                      setEditingHall(null)
                      setShowModal(true)
                    }}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Create Your First Hall
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl max-w-lg w-full rounded-2xl border border-white/10 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingHall ? 'Edit Function Hall' : 'Add Function Hall'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Hall Name *</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingHall?.name || ''}
                  className="form-input"
                  placeholder="e.g., Grand Ballroom"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Capacity *</label>
                  <input
                    name="capacity"
                    type="number"
                    required
                    defaultValue={editingHall?.capacity || ''}
                    className="form-input"
                    placeholder="Max guests"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Price/Day *</label>
                  <input
                    name="pricePerDay"
                    type="number"
                    required
                    defaultValue={editingHall?.pricePerDay || ''}
                    className="form-input"
                    placeholder="₹"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Price/Hour (Optional)</label>
                <input
                  name="pricePerHour"
                  type="number"
                  defaultValue={editingHall?.pricePerHour || ''}
                  className="form-input"
                  placeholder="₹"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Amenities</label>
                <input
                  name="amenities"
                  type="text"
                  defaultValue={editingHall?.amenities || ''}
                  className="form-input"
                  placeholder="AC, Projector, Stage, Sound System..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingHall?.description || ''}
                  className="form-input"
                  rows={3}
                  placeholder="Brief description of the hall..."
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingHall(null)
                  }}
                  className="flex-1 py-2 px-4 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2 px-4 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 transition-all disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : (editingHall ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Delete Function Hall"
        message="Are you sure you want to delete this function hall? This action cannot be undone."
        action="Delete"
        type="delete"
        onConfirm={() => {
          if (deleteModal.hallId) {
            deleteMutation.mutate(deleteModal.hallId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, hallId: null })}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Hall"
      />
    </>
  )
}
