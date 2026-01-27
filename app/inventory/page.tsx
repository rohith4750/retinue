'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaBox, FaPlus, FaExclamationTriangle, FaEdit, FaTrash } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; itemId: string | null }>({
    show: false,
    itemId: null
  })
  const queryClient = useQueryClient()

  // Check user role
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get('/inventory'),
  })

  const items = data?.items || []
  const lowStockItems = data?.lowStockItems || []

  // Delete mutation
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    endpoint: '/inventory',
    onSuccess: () => {
      setDeleteModal({ show: false, itemId: null })
      toast.success('Inventory item deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete inventory item')
    }
  })

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    setDeleteModal({ show: true, itemId: id })
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Inventory Management</h1>
            <p className="text-sm text-slate-400">Track and manage inventory items</p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowModal(true)
            }}
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
                {isSuperAdmin && <th className="text-right">Actions</th>}
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
                    {isSuperAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center">
                      <FaBox className="text-4xl mb-2 text-slate-500" />
                      <p className="text-lg font-medium text-slate-300">No inventory items found</p>
                      <p className="text-sm text-slate-500">Click &quot;Add Item&quot; to add your first inventory item</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <InventoryModal 
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }} 
            editingItem={editingItem}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Delete Inventory Item"
        message="Are you sure you want to delete this inventory item? This action cannot be undone."
        action="Delete"
        type="delete"
        onConfirm={() => {
          if (deleteModal.itemId) {
            deleteMutation.mutate(deleteModal.itemId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, itemId: null })}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Item"
      />
    </>
  )
}

function InventoryModal({ onClose, editingItem }: { onClose: () => void; editingItem?: any }) {
  const [formData, setFormData] = useState({
    itemName: editingItem?.itemName || '',
    category: editingItem?.category || '',
    quantity: editingItem?.quantity?.toString() || '',
    unit: editingItem?.unit || '',
    minStock: editingItem?.minStock?.toString() || '',
  })

  const queryClient = useQueryClient()

  const createMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => {
      if (editingItem) {
        return api.put(`/inventory/${editingItem.id}`, data)
      }
      return api.post('/inventory', data)
    },
    endpoint: '/inventory',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
      toast.success(editingItem ? 'Inventory item updated successfully' : 'Inventory item created successfully')
    },
    onError: () => {
      toast.error(editingItem ? 'Failed to update inventory item' : 'Failed to create inventory item')
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
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
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
                disabled={createMutation.isPending}
                className="btn-primary"
              >
                <span>{createMutation.isPending ? 'Saving...' : (editingItem ? 'Update' : 'Create')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
