'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { FaUsers, FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function StaffPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; staffId: string | null }>({
    show: false,
    staffId: null
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

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff'),
  })

  // Delete mutation
  const deleteMutation = useMutationWithInvalidation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    endpoint: '/staff',
    onSuccess: () => {
      setDeleteModal({ show: false, staffId: null })
      toast.success('Staff member deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete staff member')
    }
  })

  const handleEdit = (member: any) => {
    setEditingStaff(member)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    setDeleteModal({ show: true, staffId: id })
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
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-400">Manage staff members and attendance</p>
          <button
            onClick={() => {
              setEditingStaff(null)
              setShowModal(true)
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Business Unit</th>
                <th>Phone</th>
                <th>Salary</th>
                <th>Status</th>
                {isSuperAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {staff?.map((member: any) => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {member.role}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge text-xs ${
                      member.businessUnit === 'CONVENTION'
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {member.businessUnit === 'CONVENTION' ? 'Convention' : 'Hotel'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {member.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {member.salary ? `₹${member.salary.toLocaleString()}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${
                      member.status === 'ACTIVE'
                        ? 'badge-success'
                        : 'badge-gray'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {(!staff || staff.length === 0) && (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center">
                      <FaUsers className="text-4xl mb-2 text-slate-500" />
                      <p className="text-lg font-medium text-slate-300">No staff members found</p>
                      <p className="text-sm text-slate-500">Click &quot;Add Staff&quot; to add your first staff member</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <StaffModal 
            onClose={() => {
              setShowModal(false)
              setEditingStaff(null)
            }} 
            editingStaff={editingStaff}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        show={deleteModal.show}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        action="Delete"
        type="delete"
        onConfirm={() => {
          if (deleteModal.staffId) {
            deleteMutation.mutate(deleteModal.staffId)
          }
        }}
        onCancel={() => setDeleteModal({ show: false, staffId: null })}
        isLoading={deleteMutation.isPending}
        confirmText="Delete Staff"
      />
    </>
  )
}

function StaffModal({ onClose, editingStaff }: { onClose: () => void; editingStaff?: any }) {
  const [formData, setFormData] = useState({
    name: editingStaff?.name || '',
    role: editingStaff?.role || '',
    phone: editingStaff?.phone || '',
    salary: editingStaff?.salary?.toString() || '',
    businessUnit: editingStaff?.businessUnit || 'HOTEL',
    status: editingStaff?.status || 'ACTIVE',
  })

  const queryClient = useQueryClient()

  const saveMutation = useMutationWithInvalidation({
    mutationFn: (data: any) => {
      if (editingStaff) {
        return api.put(`/staff/${editingStaff.id}`, data)
      }
      return api.post('/staff', data)
    },
    endpoint: '/staff',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      onClose()
      toast.success(editingStaff ? 'Staff member updated successfully' : 'Staff member added successfully')
    },
    onError: () => {
      toast.error(editingStaff ? 'Failed to update staff member' : 'Failed to add staff member')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative z-10">
          <div className="card-header">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <FaUsers className="mr-2 w-4 h-4" />
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="form-input"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="form-label">Role *</label>
              <input
                type="text"
                required
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="e.g., Receptionist, Manager, Housekeeping"
                className="form-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="form-input"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="form-label">Salary</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                  className="form-input"
                  placeholder="Salary amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Business Unit *</label>
                <select
                  value={formData.businessUnit}
                  onChange={(e) =>
                    setFormData({ ...formData, businessUnit: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="HOTEL">The Retinue (Hotel)</option>
                  <option value="CONVENTION">Buchirajuu Convention</option>
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
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
                disabled={saveMutation.isPending}
                className="btn-primary"
              >
                <span>{saveMutation.isPending ? 'Saving...' : (editingStaff ? 'Update' : 'Create')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
