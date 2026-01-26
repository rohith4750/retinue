'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '@/components/Navbar'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaUsers, FaPlus } from 'react-icons/fa'

export default function StaffPage() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    }
  }, [router])

  const queryClient = useQueryClient()

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get('/staff'),
  })

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
            <h1 className="text-2xl font-bold text-slate-100 mb-1">Staff Management</h1>
            <p className="text-sm text-slate-400">Manage hotel staff members and attendance</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
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
                <th>Phone</th>
                <th>Salary</th>
                <th>Status</th>
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
                </tr>
              ))}
              {(!staff || staff.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center">
                      <FaUsers className="text-4xl mb-2 text-slate-500" />
                      <p className="text-lg font-medium text-slate-300">No staff members found</p>
                      <p className="text-sm text-slate-500">Click "Add Staff" to add your first staff member</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && <StaffModal onClose={() => setShowModal(false)} />}
        </div>
      </div>
    </div>
  )
}

function StaffModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    phone: '',
    salary: '',
    status: 'ACTIVE',
  })

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/staff', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      onClose()
      toast.success('Staff member added successfully')
    },
    onError: () => {
      toast.error('Failed to add staff member')
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
              <FaUsers className="mr-2 w-4 h-4" />
              Add Staff Member
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
