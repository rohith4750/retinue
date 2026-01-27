'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { FaPlus, FaBox, FaHome, FaBuilding, FaEdit, FaTrash, FaMapMarkerAlt } from 'react-icons/fa'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function AssetsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [filterRoom, setFilterRoom] = useState('')
  const [filterHall, setFilterHall] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; assetId: string | null }>({
    show: false,
    assetId: null
  })

  // Check user role
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      if (parsed.role !== 'SUPER_ADMIN') {
        router.push('/dashboard')
      }
    }
  }, [router])

  // Fetch asset locations
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['asset-locations', filterRoom, filterHall],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterRoom) params.append('roomId', filterRoom)
      if (filterHall) params.append('functionHallId', filterHall)
      return api.get(`/asset-locations?${params.toString()}`)
    },
    enabled: user?.role === 'SUPER_ADMIN'
  })

  // Fetch rooms for filter
  const { data: roomsData } = useQuery({
    queryKey: ['rooms-list'],
    queryFn: () => api.get('/rooms'),
    enabled: user?.role === 'SUPER_ADMIN'
  })

  // Fetch function halls for filter
  const { data: hallsData } = useQuery({
    queryKey: ['function-halls-list'],
    queryFn: () => api.get('/function-halls'),
    enabled: user?.role === 'SUPER_ADMIN'
  })

  const assets = assetsData?.data || []
  const rooms = roomsData || []
  const halls = hallsData || []
  const summary = assetsData?.summary || {}

  // Filter assets by search
  const filteredAssets = assets.filter((asset: any) => {
    if (!debouncedSearch) return true
    const searchLower = debouncedSearch.toLowerCase()
    return (
      asset.inventory?.itemName?.toLowerCase().includes(searchLower) ||
      asset.room?.roomNumber?.toLowerCase().includes(searchLower) ||
      asset.functionHall?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Group assets by location
  const assetsByRoom: Record<string, any[]> = {}
  const assetsByHall: Record<string, any[]> = {}

  filteredAssets.forEach((asset: any) => {
    if (asset.roomId) {
      const key = asset.room?.roomNumber || asset.roomId
      if (!assetsByRoom[key]) assetsByRoom[key] = []
      assetsByRoom[key].push(asset)
    } else if (asset.functionHallId) {
      const key = asset.functionHall?.name || asset.functionHallId
      if (!assetsByHall[key]) assetsByHall[key] = []
      assetsByHall[key].push(asset)
    }
  })

  // Delete mutation
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/asset-locations/${id}`),
    endpoint: '/asset-locations',
    onSuccess: () => {
      setDeleteModal({ show: false, assetId: null })
      toast.success('Asset removed from location')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove asset')
    }
  })

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'GOOD': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
      case 'FAIR': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'POOR': return 'bg-orange-500/20 text-orange-400 border-orange-500'
      case 'DAMAGED': return 'bg-red-500/20 text-red-400 border-red-500'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500'
    }
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return null
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Search assets..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-48"
            />
            <select
              value={filterRoom}
              onChange={(e) => {
                setFilterRoom(e.target.value)
                setFilterHall('')
              }}
              className="form-input text-sm w-40"
            >
              <option value="">All Rooms</option>
              {rooms.map((room: any) => (
                <option key={room.id} value={room.id}>{room.roomNumber}</option>
              ))}
            </select>
            <select
              value={filterHall}
              onChange={(e) => {
                setFilterHall(e.target.value)
                setFilterRoom('')
              }}
              className="form-input text-sm w-40"
            >
              <option value="">All Halls</option>
              {halls.map((hall: any) => (
                <option key={hall.id} value={hall.id}>{hall.name}</option>
              ))}
            </select>
          </div>

          <Link
            href="/assets/assign"
            className="flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            <span>Assign Asset</span>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
                <FaBox className="text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.totalAssets || 0}</p>
                <p className="text-xs text-slate-400">Total Assignments</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <FaMapMarkerAlt className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.totalQuantity || 0}</p>
                <p className="text-xs text-slate-400">Total Items</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <FaHome className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.roomsWithAssets || 0}</p>
                <p className="text-xs text-slate-400">Rooms with Assets</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FaBuilding className="text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.hallsWithAssets || 0}</p>
                <p className="text-xs text-slate-400">Halls with Assets</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assets by Room */}
        {Object.keys(assetsByRoom).length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FaHome className="text-amber-400" />
              Hotel Rooms
            </h2>
            <div className="space-y-3">
              {Object.entries(assetsByRoom).map(([roomNumber, roomAssets]) => (
                <div key={roomNumber} className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-amber-400">Room {roomNumber}</h3>
                    <span className="text-xs text-slate-400">{roomAssets.length} item types</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roomAssets.map((asset: any) => (
                      <div
                        key={asset.id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-white/5 group"
                      >
                        <span className="text-sm text-white">{asset.inventory?.itemName}</span>
                        <span className="text-xs bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded">×{asset.quantity}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConditionColor(asset.condition)}`}>
                          {asset.condition}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1 ml-1">
                          <Link
                            href={`/assets/assign?edit=${asset.id}`}
                            className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                          >
                            <FaEdit className="w-3 h-3" />
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ show: true, assetId: asset.id })}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assets by Hall */}
        {Object.keys(assetsByHall).length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FaBuilding className="text-purple-400" />
              Function Halls
            </h2>
            <div className="space-y-3">
              {Object.entries(assetsByHall).map(([hallName, hallAssets]) => (
                <div key={hallName} className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-purple-400">{hallName}</h3>
                    <span className="text-xs text-slate-400">{hallAssets.length} item types</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hallAssets.map((asset: any) => (
                      <div
                        key={asset.id}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/60 rounded-lg border border-white/5 group"
                      >
                        <span className="text-sm text-white">{asset.inventory?.itemName}</span>
                        <span className="text-xs bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded">×{asset.quantity}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConditionColor(asset.condition)}`}>
                          {asset.condition}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1 ml-1">
                          <Link
                            href={`/assets/assign?edit=${asset.id}`}
                            className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                          >
                            <FaEdit className="w-3 h-3" />
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ show: true, assetId: asset.id })}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <FaTrash className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAssets.length === 0 && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-12 border border-white/5 text-center">
            <FaBox className="text-4xl text-slate-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300 mb-1.5">No assets assigned yet</p>
            <p className="text-xs text-slate-500 mb-4">Click "Assign Asset" to track where your inventory items are located</p>
            <Link
              href="/assets/assign"
              className="inline-block px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-500 transition-colors"
            >
              Assign First Asset
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Remove Asset"
        message="Are you sure you want to remove this asset from its location?"
        action="Remove"
        type="delete"
        onConfirm={() => {
          if (deleteModal.assetId) {
            deleteMutation.mutate(deleteModal.assetId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, assetId: null })}
        isLoading={deleteMutation.isPending}
        confirmText="Remove"
      />
    </>
  )
}
