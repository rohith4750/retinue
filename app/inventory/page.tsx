'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaBox, FaPlus, FaExclamationTriangle } from 'react-icons/fa'

export default function InventoryPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
  })

  const items = data?.items || []
  const lowStockItems = data?.lowStockItems || []

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
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Inventory Management</h1>
            <p className="text-sm text-slate-400">Track and manage hotel inventory items</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <p className="font-bold text-yellow-400 flex items-center">
              <FaExclamationTriangle className="mr-2" />
              Low Stock Alert!
            </p>
            <p className="text-sm text-slate-300 mt-1">
              {lowStockItems.length} item(s) are below minimum stock level
            </p>
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Min Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const isLowStock = item.quantity <= item.minStock
                return (
                  <tr key={item.id} className={isLowStock ? 'bg-yellow-500/5' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                      {item.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {item.minStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isLowStock ? (
                        <span className="badge badge-warning">
                          Low Stock
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {showModal && <InventoryModal onClose={() => setShowModal(false)} />}
        </div>
      </div>
    </div>
  )
}

function InventoryModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    quantity: '',
    unit: '',
    minStock: '',
  })

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
      toast.success('Inventory item created successfully')
    },
    onError: () => {
      toast.error('Failed to create inventory item')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative z-10">
          <div className="card-header">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <FaBox className="mr-2 w-4 h-4" />
              Add Inventory Item
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Item Name *</label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                className="form-input"
                placeholder="Item name"
              />
            </div>
            <div>
              <label className="form-label">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="form-input"
                placeholder="Category"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  required
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Unit *</label>
                <input
                  type="text"
                  required
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  placeholder="pieces, kg, liters"
                  className="form-input"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Minimum Stock *</label>
              <input
                type="number"
                required
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                className="form-input"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                <span>Create</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
