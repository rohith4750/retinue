'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { FaArrowLeft, FaHome, FaBuilding, FaBox, FaSave, FaMapMarkerAlt } from 'react-icons/fa'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'

export default function AssignAssetPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [user, setUser] = useState<any>(null)
  const [locationType, setLocationType] = useState<'room' | 'hall'>('room')
  const [formData, setFormData] = useState({
    inventoryId: '',
    roomId: '',
    functionHallId: '',
    quantity: '1',
    condition: 'GOOD',
    notes: ''
  })

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      const allowed = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST']
      if (!allowed.includes(parsed.role)) {
        router.push('/dashboard')
      }
    }
  }, [router])

  const canAccess = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST'

  // Fetch existing asset location if editing
  const { data: existingAsset } = useQuery({
    queryKey: ['asset-location', editId],
    queryFn: () => api.get(`/asset-locations/${editId}`),
    enabled: !!editId && !!canAccess
  })

  // Pre-fill form when editing - handle both wrapped and unwrapped responses
  useEffect(() => {
    const asset = existingAsset?.data || existingAsset
    if (asset && asset.id) {
      setFormData({
        inventoryId: asset.inventoryId || '',
        roomId: asset.roomId || '',
        functionHallId: asset.functionHallId || '',
        quantity: asset.quantity?.toString() || '1',
        condition: asset.condition || 'GOOD',
        notes: asset.notes || ''
      })
      setLocationType(asset.roomId ? 'room' : 'hall')
    }
  }, [existingAsset])

  // Fetch rooms
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms'),
    enabled: !!canAccess
  })

  // Fetch function halls
  const { data: hallsData } = useQuery({
    queryKey: ['function-halls'],
    queryFn: () => api.get('/function-halls'),
    enabled: !!canAccess
  })

  // Fetch inventory items
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
    enabled: !!canAccess
  })

  // Normalize to arrays (api.get returns data.data; support wrapped shapes)
  const rooms = Array.isArray(roomsData) ? roomsData : (roomsData as any)?.data ?? []
  const halls = Array.isArray(hallsData) ? hallsData : (hallsData as any)?.data ?? []
  const inventoryItems = Array.isArray((inventoryData as any)?.items)
    ? (inventoryData as any).items
    : Array.isArray(inventoryData)
      ? inventoryData
      : []

  // Mutation
  const mutation = useMutationWithInvalidation({
    mutationFn: (data: any) => {
      if (editId) {
        return api.put(`/asset-locations/${editId}`, data)
      }
      return api.post('/asset-locations', data)
    },
    endpoint: '/asset-locations',
    onSuccess: () => {
      // Force invalidate all asset-locations queries
      queryClient.invalidateQueries({ queryKey: ['asset-locations'] })
      toast.success(editId ? 'Asset location updated!' : 'Asset assigned successfully!')
      router.push('/assets')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign asset')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      inventoryId: formData.inventoryId,
      roomId: locationType === 'room' ? formData.roomId : null,
      functionHallId: locationType === 'hall' ? formData.functionHallId : null,
      quantity: formData.quantity,
      condition: formData.condition,
      notes: formData.notes
    }

    mutation.mutate(submitData)
  }

  if (!user || !canAccess) {
    return null
  }

  return (
    <div className="w-full px-4 lg:px-6 py-4 relative z-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/assets"
          className="p-2 bg-slate-800/60 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FaMapMarkerAlt className="text-sky-400" />
            {editId ? 'Edit Asset Location' : 'Assign Asset to Location'}
          </h1>
          <p className="text-sm text-slate-400">Track where your inventory items are located</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-white/5 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Inventory Item */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <FaBox className="inline mr-2 text-sky-400" />
              Select Inventory Item *
            </label>
            <select
              value={formData.inventoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, inventoryId: e.target.value }))}
              required
              disabled={!!editId}
              className="form-input"
            >
              <option value="">-- Select an item --</option>
              {inventoryItems.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.itemName} ({item.category}) - Stock: {item.quantity} {item.unit}
                </option>
              ))}
            </select>
            {inventoryItems.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                No inventory items found. Please add items in Inventory first.
              </p>
            )}
          </div>

          {/* Location Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLocationType('room')
                  setFormData(prev => ({ ...prev, functionHallId: '' }))
                }}
                className={`p-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                  locationType === 'room'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <FaHome className="w-6 h-6" />
                Hotel Room
              </button>
              <button
                type="button"
                onClick={() => {
                  setLocationType('hall')
                  setFormData(prev => ({ ...prev, roomId: '' }))
                }}
                className={`p-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 ${
                  locationType === 'hall'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <FaBuilding className="w-6 h-6" />
                Function Hall
              </button>
            </div>
          </div>

          {/* Select Room */}
          {locationType === 'room' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FaHome className="inline mr-2 text-amber-400" />
                Select Room *
              </label>
              <select
                value={formData.roomId}
                onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
                required
                className="form-input"
              >
                <option value="">-- Select a room --</option>
                {rooms.map((room: any) => (
                  <option key={room.id} value={room.id}>
                    {room.roomNumber} - {room.roomType} (Floor {room.floor})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Select Hall */}
          {locationType === 'hall' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FaBuilding className="inline mr-2 text-purple-400" />
                Select Function Hall *
              </label>
              <select
                value={formData.functionHallId}
                onChange={(e) => setFormData(prev => ({ ...prev, functionHallId: e.target.value }))}
                required
                className="form-input"
              >
                <option value="">-- Select a hall --</option>
                {halls.map((hall: any) => (
                  <option key={hall.id} value={hall.id}>
                    {hall.name} (Capacity: {hall.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity and Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                required
                min="1"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                className="form-input"
              >
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="form-input min-h-[80px]"
              placeholder="Any additional notes about this asset..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/assets"
              className="flex-1 py-3 px-4 bg-slate-800 text-slate-300 font-medium rounded-xl text-center hover:bg-slate-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-3 px-4 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              {mutation.isPending ? 'Saving...' : (editId ? 'Update Location' : 'Assign Asset')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
