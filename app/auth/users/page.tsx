'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaUsers, FaUserShield, FaUserTie, FaUserCheck, FaUser, FaPlus, FaKey, FaUserPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { FormInput, FormSelect } from '@/components/FormComponents'
import { ConfirmationModal } from '@/components/ConfirmationModal'

export default function UsersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
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
  })

  const createUsersMutation = useMutation({
    mutationFn: () => api.post('/auth/create-users'),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(data.message || 'Users created successfully')
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create users')
    },
  })

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/users', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(data.message || 'User created successfully')
      setShowNewUserModal(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create user')
    },
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
      case 'STAFF':
        return <FaUser className="w-4 h-4" />
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
      case 'STAFF':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
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
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <button
                onClick={() => setShowNewUserModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <FaUserPlus className="w-4 h-4" />
                <span>Create User</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <FaKey className="w-4 h-4" />
              <span>Create Default Users</span>
            </button>
          </div>
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
              <p className="text-xs text-slate-500 mb-4">Click "Create Default Users" to create users for all roles</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-sm px-4 py-2"
              >
                <span>Create Default Users</span>
              </button>
            </div>
          </div>
        )}

        {/* Create New User Modal (Admin Only) */}
        {showNewUserModal && isAdmin && (
          <CreateUserModal
            onClose={() => setShowNewUserModal(false)}
            onCreate={(userData: any) => createUserMutation.mutate(userData)}
            isLoading={createUserMutation.isPending}
          />
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

        {/* Create Default Users Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 relative z-10">
                <div className="card-header">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center">
                    <FaKey className="mr-2 w-4 h-4" />
                    Create Default Users
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    This will create users for all roles with default credentials
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="bg-slate-800/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Default Credentials:</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">SUPER_ADMIN:</span>
                        <span className="text-slate-200">superadmin / superadmin123</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ADMIN:</span>
                        <span className="text-slate-200">admin / admin123</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">RECEPTIONIST:</span>
                        <span className="text-slate-200">receptionist / receptionist123</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">STAFF:</span>
                        <span className="text-slate-200">staff / staff123</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t border-white/5 mt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="btn-secondary text-sm px-4 py-2"
                      disabled={createUsersMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => createUsersMutation.mutate()}
                      className="btn-primary text-sm px-4 py-2"
                      disabled={createUsersMutation.isPending}
                    >
                      {createUsersMutation.isPending ? 'Creating...' : 'Create Users'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Create User Modal Component
function CreateUserModal({
  onClose,
  onCreate,
  isLoading,
}: {
  onClose: () => void
  onCreate: (data: any) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STAFF',
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

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      onCreate({
        username: formData.username,
        email: formData.email.trim(),
        password: formData.password,
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
              <FaUserPlus className="mr-2 w-4 h-4" />
              Create New User
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Create a new user account with custom credentials
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

            <FormInput
              label="Password *"
              type="password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, password: e.target.value })
                if (errors.password) setErrors({ ...errors, password: '' })
              }}
              error={errors.password}
              placeholder="Minimum 6 characters"
              required
            />

            <FormInput
              label="Confirm Password *"
              type="password"
              value={formData.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, confirmPassword: e.target.value })
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
              }}
              error={errors.confirmPassword}
              placeholder="Re-enter password"
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
                { value: 'STAFF', label: 'Staff' },
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
                {isLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Edit User Modal Component
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
    password: '',
    confirmPassword: '',
    role: user.role || 'STAFF',
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

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      const updateData: any = {
        username: formData.username,
        email: formData.email.trim(),
        role: formData.role,
      }
      
      // Only include password if it's provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password
      }

      onUpdate(updateData)
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

            <FormInput
              label="New Password"
              type="password"
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, password: e.target.value })
                if (errors.password) setErrors({ ...errors, password: '' })
              }}
              error={errors.password}
              placeholder="Leave blank to keep current password"
            />

            {formData.password && (
              <FormInput
                label="Confirm New Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData({ ...formData, confirmPassword: e.target.value })
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                }}
                error={errors.confirmPassword}
                placeholder="Re-enter new password"
              />
            )}

            <FormSelect
              label="Role *"
              value={formData.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setFormData({ ...formData, role: e.target.value })
                if (errors.role) setErrors({ ...errors, role: '' })
              }}
              error={errors.role}
              options={[
                { value: 'STAFF', label: 'Staff' },
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
