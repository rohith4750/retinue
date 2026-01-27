'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { FaUser, FaEnvelope, FaUserShield, FaCalendarAlt, FaKey, FaLock, FaCheck, FaSpinner } from 'react-icons/fa'
import { FormInput } from '@/components/FormComponents'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setShowChangePassword(false)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setErrors({})
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to change password')
    },
  })

  const validatePassword = () => {
    const newErrors: Record<string, string> = {}

    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters'
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      newErrors.newPassword = 'New password must be different from current password'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (validatePassword()) {
      changePasswordMutation.mutate({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/30'
      case 'ADMIN':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'RECEPTIONIST':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30'
      case 'STAFF':
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30'
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30'
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="glow-sky top-20 right-20"></div>
      <div className="glow-emerald bottom-20 left-20"></div>
      <div className="w-full px-4 lg:px-6 py-4 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Overview Card */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Profile Overview</h2>
                <p className="text-xs text-slate-400 mt-1">Your account information</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-emerald-400 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              {/* Username */}
              <div className="flex items-center space-x-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
                <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center">
                  <FaUser className="w-4 h-4 text-sky-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Username</p>
                  <p className="text-base font-semibold text-slate-100">{user.username}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center space-x-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <FaEnvelope className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-base font-semibold text-slate-100">{user.email || 'Not set'}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center space-x-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <FaUserShield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Role</p>
                  <span className={`inline-flex items-center px-3 py-1 mt-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role)}`}>
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Created At */}
              {user.createdAt && (
                <div className="flex items-center space-x-4 p-4 bg-slate-800/40 rounded-xl border border-white/5">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <FaCalendarAlt className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Member Since</p>
                    <p className="text-base font-semibold text-slate-100">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Password Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-bold text-slate-100 flex items-center">
                <FaKey className="mr-2 w-4 h-4 text-amber-400" />
                Security
              </h2>
              <p className="text-xs text-slate-400 mt-1">Manage your password</p>
            </div>

            {!showChangePassword ? (
              <div className="mt-4">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-white/5 hover:bg-slate-800/60 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                      <FaLock className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-100">Change Password</p>
                      <p className="text-xs text-slate-400">Update your password for security</p>
                    </div>
                  </div>
                  <span className="text-slate-500 group-hover:text-slate-300 transition-colors">→</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <FormInput
                  label="Current Password *"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' })
                  }}
                  error={errors.currentPassword}
                  placeholder="Enter your current password"
                  required
                />

                <FormInput
                  label="New Password *"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    if (errors.newPassword) setErrors({ ...errors, newPassword: '' })
                  }}
                  error={errors.newPassword}
                  placeholder="Minimum 6 characters"
                  required
                />

                <FormInput
                  label="Confirm New Password *"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                  }}
                  error={errors.confirmPassword}
                  placeholder="Re-enter new password"
                  required
                />

                <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false)
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      })
                      setErrors({})
                    }}
                    className="btn-secondary text-sm px-4 py-2"
                    disabled={changePasswordMutation.isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-sm px-4 py-2 flex items-center space-x-2"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        <span>Changing...</span>
                      </>
                    ) : (
                      <>
                        <FaCheck className="w-4 h-4" />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
