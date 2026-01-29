'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { 
  FaPlus, FaBox, FaHome, FaBuilding, FaEdit, FaTrash, FaMapMarkerAlt,
  FaChevronRight, FaChevronDown, FaFolder, FaFolderOpen, FaCubes
} from 'react-icons/fa'
import { SearchInput } from '@/components/SearchInput'
import { useDebounce } from '@/hooks/useDebounce'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

// Tree Node Component for Location
function LocationNode({ 
  location, 
  assets, 
  type, 
  onDelete, 
  getConditionColor 
}: { 
  location: any
  assets: any[]
  type: 'room' | 'hall'
  onDelete: (id: string) => void
  getConditionColor: (condition: string) => string
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const totalQuantity = assets.reduce((sum, a) => sum + (a.quantity || 0), 0)

  return (
    <div className="select-none">
      {/* Location Header */}
      <div 
        className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        <span className="text-slate-500 w-4">
          {isExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
        </span>
        
        {/* Folder Icon */}
        {isExpanded ? (
          <FaFolderOpen className={`w-4 h-4 ${type === 'room' ? 'text-amber-400' : 'text-purple-400'}`} />
        ) : (
          <FaFolder className={`w-4 h-4 ${type === 'room' ? 'text-amber-400' : 'text-purple-400'}`} />
        )}
        
        {/* Location Name */}
        <span className="text-white font-medium flex-1">
          {type === 'room' ? location.roomNumber : location.name}
        </span>
        
        {/* Item Count Badge */}
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
          {assets.length} {assets.length === 1 ? 'item' : 'items'} • {totalQuantity} qty
        </span>
        
        {/* Location Type Badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded ${
          type === 'room' 
            ? 'bg-amber-500/20 text-amber-400' 
            : 'bg-purple-500/20 text-purple-400'
        }`}>
          {type === 'room' ? `Floor ${location.floor}` : `${location.capacity} guests`}
        </span>
      </div>

      {/* Assets List (Children) */}
      {isExpanded && (
        <div className="ml-6 border-l-2 border-slate-700/50 pl-4 mt-1 space-y-1">
          {assets.map((asset: any) => (
            <div 
              key={asset.id} 
              className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-800/30 transition-colors group"
            >
              {/* Tree Branch */}
              <span className="text-slate-600">└</span>
              
              {/* Asset Icon */}
              <FaCubes className="w-3.5 h-3.5 text-sky-400" />
              
              {/* Asset Name */}
              <span className="text-slate-200 flex-1">{asset.inventory?.itemName || 'Unknown'}</span>
              
              {/* Quantity */}
              <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-medium">
                ×{asset.quantity}
              </span>
              
              {/* Condition */}
              <span className={`text-[10px] px-2 py-0.5 rounded border ${getConditionColor(asset.condition)}`}>
                {asset.condition}
              </span>
              
              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/assets/assign?edit=${asset.id}`}
                  className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FaEdit className="w-3 h-3" />
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(asset.id)
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <FaTrash className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssetsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; assetId: string | null }>({
    show: false,
    assetId: null
  })
  const [expandRooms, setExpandRooms] = useState(true)
  const [expandHalls, setExpandHalls] = useState(true)

  // Check user role
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsed = JSON.parse(userData)
      setUser(parsed)
      // Allow SUPER_ADMIN, ADMIN, and RECEPTIONIST to access
      if (!['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(parsed.role)) {
        router.push('/dashboard')
      }
    }
  }, [router])

  // Fetch asset locations
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['asset-locations'],
    queryFn: () => api.get('/asset-locations'),
    enabled: mounted && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST'),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Fetch rooms
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms'),
    enabled: mounted && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST'),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Fetch function halls
  const { data: hallsData } = useQuery({
    queryKey: ['function-halls'],
    queryFn: () => api.get('/function-halls'),
    enabled: mounted && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST'),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Process data – handle API response shape (api.get returns data.data; fallback for wrapped)
  const assets = useMemo(() => {
    if (!assetsData) return []
    if (Array.isArray(assetsData)) return assetsData
    if (Array.isArray(assetsData?.data)) return assetsData.data
    return []
  }, [assetsData])

  const rooms = useMemo(() => {
    if (!roomsData) return []
    if (Array.isArray(roomsData)) return roomsData
    if (Array.isArray(roomsData?.data)) return roomsData.data
    return (roomsData as any)?.rooms || []
  }, [roomsData])

  const halls = useMemo(() => {
    if (!hallsData) return []
    if (Array.isArray(hallsData)) return hallsData
    if (Array.isArray(hallsData?.data)) return hallsData.data
    return (hallsData as any)?.halls || []
  }, [hallsData])

  // Filter assets by search
  const filteredAssets = useMemo(() => {
    if (!debouncedSearch) return assets
    const searchLower = debouncedSearch.toLowerCase()
    return assets.filter((asset: any) => 
      asset.inventory?.itemName?.toLowerCase().includes(searchLower) ||
      asset.room?.roomNumber?.toLowerCase().includes(searchLower) ||
      asset.functionHall?.name?.toLowerCase().includes(searchLower)
    )
  }, [assets, debouncedSearch])

  // Group assets by room
  const assetsByRoom = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    filteredAssets.forEach((asset: any) => {
      if (asset.roomId && asset.room) {
        if (!grouped[asset.roomId]) grouped[asset.roomId] = []
        grouped[asset.roomId].push(asset)
      }
    })
    return grouped
  }, [filteredAssets])

  // Group assets by hall
  const assetsByHall = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    filteredAssets.forEach((asset: any) => {
      if (asset.functionHallId && asset.functionHall) {
        if (!grouped[asset.functionHallId]) grouped[asset.functionHallId] = []
        grouped[asset.functionHallId].push(asset)
      }
    })
    return grouped
  }, [filteredAssets])

  // Get room/hall by ID
  const getRoomById = (id: string) => rooms.find((r: any) => r.id === id) || filteredAssets.find((a: any) => a.roomId === id)?.room
  const getHallById = (id: string) => halls.find((h: any) => h.id === id) || filteredAssets.find((a: any) => a.functionHallId === id)?.functionHall

  // Calculate summary
  const summary = useMemo(() => ({
    totalAssets: assets.length,
    totalQuantity: assets.reduce((sum: number, a: any) => sum + (a.quantity || 0), 0),
    roomsWithAssets: Object.keys(assetsByRoom).length,
    hallsWithAssets: Object.keys(assetsByHall).length
  }), [assets, assetsByRoom, assetsByHall])

  // Delete mutation
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/asset-locations/${id}`),
    endpoint: '/asset-locations',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-locations'] })
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

  // Loading state
  if (!mounted || !user || (isLoading && !assetsData)) {
    return (
      <div className="w-full px-4 lg:px-6 py-4">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST']
  if (!user || !allowedRoles.includes(user.role)) {
    return null
  }

  const hasRoomAssets = Object.keys(assetsByRoom).length > 0
  const hasHallAssets = Object.keys(assetsByHall).length > 0

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
              className="w-64"
            />
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
                <p className="text-2xl font-bold text-white">{summary.totalAssets}</p>
                <p className="text-xs text-slate-400">Assignments</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <FaMapMarkerAlt className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.totalQuantity}</p>
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
                <p className="text-2xl font-bold text-white">{summary.roomsWithAssets}</p>
                <p className="text-xs text-slate-400">Rooms</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FaBuilding className="text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{summary.hallsWithAssets}</p>
                <p className="text-xs text-slate-400">Halls</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tree View */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden">
          {/* Hotel Rooms Section */}
          {(hasRoomAssets || !hasHallAssets) && (
            <div className="border-b border-white/5">
              <div 
                className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
                onClick={() => setExpandRooms(!expandRooms)}
              >
                <span className="text-amber-400">
                  {expandRooms ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
                </span>
                <FaHome className="w-4 h-4 text-amber-400" />
                <span className="text-white font-semibold flex-1">Hotel Rooms</span>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                  {Object.keys(assetsByRoom).length} locations
                </span>
              </div>
              
              {expandRooms && (
                <div className="px-4 py-2 space-y-1">
                  {hasRoomAssets ? (
                    Object.entries(assetsByRoom).map(([roomId, roomAssets]) => {
                      const room = getRoomById(roomId)
                      if (!room) return null
                      return (
                        <LocationNode
                          key={roomId}
                          location={room}
                          assets={roomAssets}
                          type="room"
                          onDelete={(id) => setDeleteModal({ show: true, assetId: id })}
                          getConditionColor={getConditionColor}
                        />
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-500 py-4 text-center">No assets assigned to rooms</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Function Halls Section */}
          <div>
            <div 
              className="flex items-center gap-3 px-4 py-3 bg-purple-500/5 cursor-pointer hover:bg-purple-500/10 transition-colors"
              onClick={() => setExpandHalls(!expandHalls)}
            >
              <span className="text-purple-400">
                {expandHalls ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
              </span>
              <FaBuilding className="w-4 h-4 text-purple-400" />
              <span className="text-white font-semibold flex-1">Function Halls</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
                {Object.keys(assetsByHall).length} locations
              </span>
            </div>
            
            {expandHalls && (
              <div className="px-4 py-2 space-y-1">
                {hasHallAssets ? (
                  Object.entries(assetsByHall).map(([hallId, hallAssets]) => {
                    const hall = getHallById(hallId)
                    if (!hall) return null
                    return (
                      <LocationNode
                        key={hallId}
                        location={hall}
                        assets={hallAssets}
                        type="hall"
                        onDelete={(id) => setDeleteModal({ show: true, assetId: id })}
                        getConditionColor={getConditionColor}
                      />
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500 py-4 text-center">No assets assigned to function halls</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredAssets.length === 0 && (
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-12 border border-white/5 text-center mt-6">
            <FaBox className="text-4xl text-slate-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300 mb-1.5">No assets assigned yet</p>
            <p className="text-xs text-slate-500 mb-4">Click &quot;Assign Asset&quot; to assign items from Stock & Assets to rooms or halls</p>
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
