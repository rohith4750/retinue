'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FaUserPlus, FaArrowLeft } from 'react-icons/fa'
import { FormInput, FormSelect } from '@/components/FormComponents'
import Link from 'next/link'

export default function CreateUserPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'RECEPTIONIST',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      const parsedUser = JSON.parse(user)
      setCurrentUser(parsedUser)
      // Redirect if not admin
      if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'SUPER_ADMIN') {
        router.push('/auth/users')
      }
    }
  }, [router])

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/auth/users', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(data.message || 'User created successfully')
      router.push('/auth/users')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create user')
    },
  })

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
      createUserMutation.mutate({
        username: formData.username,
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      })
    }
  }

  // Check if current user is admin or super admin
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN'

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        <div className="mb-6">
          <Link
            href="/auth/users"
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <FaArrowLeft className="w-3 h-3 mr-2" />
            Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center">
            <FaUserPlus className="mr-3 w-6 h-6" />
            Create New User
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create a new user account with custom credentials
          </p>
        </div>

        <div className="card max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                { value: 'RECEPTIONIST', label: 'Receptionist' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
              ]}
              required
            />

            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5 mt-6">
              <Link
                href="/auth/users"
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="btn-primary text-sm px-4 py-2"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
