'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaUsers, FaUserShield, FaUserTie, FaUserCheck, FaUser, FaUserPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FormInput, FormSelect } from '@/components/FormComponents'
import { ConfirmationModal } from '@/components/ConfirmationModal'
import Link from 'next/link'

export default function UsersPage() {
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; userId: string | null }>({ show: false, userId: null })
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      setCurrentUser(JSON.parse(user))
    }
  }, [])

  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users'),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/auth/users/${id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(data.message || 'User updated successfully')
      setShowEditModal(false)
      setEditingUser(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update user')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(data.message || 'User deleted successfully')
      setDeleteModal({ show: false, userId: null })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete user')
    },
  })

  // Check if current user is admin or super admin
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <FaUserShield className="w-4 h-4" />
      case 'ADMIN':
        return <FaUserTie className="w-4 h-4" />
      case 'RECEPTIONIST':
        return <FaUserCheck className="w-4 h-4" />
      default:
        return <FaUser className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      case 'ADMIN':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'RECEPTIONIST':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
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
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-400">Manage user accounts and roles</p>
          {isAdmin && (
            <Link
              href="/auth/users/new"
              className="btn-primary flex items-center space-x-2"
            >
              <FaUserPlus className="w-4 h-4" />
              <span>Create User</span>
            </Link>
          )}
        </div>

        {users && users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user: any) => (
              <div key={user.id} className="card group hover:scale-105 transition-transform duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-100 truncate">{user.username}</h3>
                      {user.email && (
                        <p className="text-xs text-slate-300 mt-0.5 truncate">{user.email}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${getRoleColor(user.role)} text-[10px] px-2 py-1 flex-shrink-0`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center space-x-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => {
                        setEditingUser(user)
                        setShowEditModal(true)
                      }}
                      className="flex-1 btn-secondary text-xs px-3 py-1.5 flex items-center justify-center space-x-1"
                    >
                      <FaEdit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteModal({ show: true, userId: user.id })}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1"
                      disabled={user.id === currentUser?.id}
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
              <FaUsers className="text-4xl mb-3 text-slate-500" />
              <p className="text-base font-semibold text-slate-300 mb-1.5">No users found</p>
              <p className="text-xs text-slate-500 mb-4">Click "Create User" to add a new user</p>
              {isAdmin && (
                <Link
                  href="/auth/users/new"
                  className="btn-primary text-sm px-4 py-2"
                >
                  <span>Create User</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Edit User Modal (Admin Only) */}
        {showEditModal && isAdmin && editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => {
              setShowEditModal(false)
              setEditingUser(null)
            }}
            onUpdate={(userData: any) => updateUserMutation.mutate({ id: editingUser.id, data: userData })}
            isLoading={updateUserMutation.isPending}
          />
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          show={deleteModal.show}
          title="Delete User"
          message="Are you sure you want to delete this user? This action cannot be undone."
          action="Delete"
          type="delete"
          onConfirm={() => {
            if (deleteModal.userId) {
              deleteUserMutation.mutate(deleteModal.userId)
            }
          }}
          onCancel={() => setDeleteModal({ show: false, userId: null })}
          isLoading={deleteUserMutation.isPending}
          confirmText="Delete User"
        />
      </div>
    </>
  )
}

// Edit User Modal Component (Only email, username, role - no password)
function EditUserModal({
  user,
  onClose,
  onUpdate,
  isLoading,
}: {
  user: any
  onClose: () => void
  onUpdate: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    role: user.role || 'RECEPTIONIST',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    // Email is required for login
    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'Email is required for login'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onUpdate({
        username: formData.username,
        email: formData.email.trim(),
        role: formData.role,
      })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative z-10">
          <div className="card-header">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <FaEdit className="mr-2 w-4 h-4" />
              Edit User
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Update user account information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <FormInput
              label="Username *"
              type="text"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, username: e.target.value })
                if (errors.username) setErrors({ ...errors, username: '' })
              }}
              error={errors.username}
              placeholder="Enter username"
              required
            />

            <FormInput
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, email: e.target.value })
                if (errors.email) setErrors({ ...errors, email: '' })
              }}
              error={errors.email}
              placeholder="user@example.com (required for login)"
              required
            />

            <FormSelect
              label="Role *"
              value={formData.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFormData({ ...formData, role: e.target.value })
                if (errors.role) setErrors({ ...errors, role: '' })
              }}
              error={errors.role}
              options={[
                { value: 'RECEPTIONIST', label: 'Receptionist' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
              ]}
              required
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm px-4 py-2"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-sm px-4 py-2"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
