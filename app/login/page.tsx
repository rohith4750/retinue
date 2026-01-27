'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { FaHotel, FaSpinner, FaTimes } from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [resetCodeSent, setResetCodeSent] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for refresh token
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store auth info
      if (data.data.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken)
      }
      localStorage.setItem('user', JSON.stringify(data.data.user))

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true')
      }

      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err.message || 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset code')
      }

      toast.success('Reset code sent to your email!')
      setResetCodeSent(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset code')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setResetPasswordLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotPasswordEmail,
          code: resetCode,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password')
      }

      toast.success('Password reset successfully! You can now login.')
      setShowForgotPassword(false)
      setResetCodeSent(false)
      setForgotPasswordEmail('')
      setResetCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setResetPasswordLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="glow-sky top-0 right-0"></div>
      <div className="glow-emerald bottom-0 left-0"></div>
      <div className="max-w-md w-full relative z-10">
        <div className="card shadow-2xl">
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-sky-500 to-emerald-400 rounded-full mb-3 shadow-[0_0_30px_rgba(14,165,233,0.5)]">
              <FaHotel className="text-xl text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-1.5">
              The Retinue
            </h2>
            <p className="text-sm text-slate-400">
              Sign in to access your dashboard
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center backdrop-blur-sm">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-sky-500 bg-slate-800 border-white/10 rounded focus:ring-sky-500 focus:ring-2"
                  />
                  <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-300">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center relative z-10">
                    <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Signing in...
                  </span>
                ) : (
                  <span className="relative z-10">Sign In</span>
                )}
              </button>
            </div>

            {/* <div className="text-center text-sm text-slate-400">
              <p>Default: <span className="font-semibold text-slate-300">admin</span> / <span className="font-semibold text-slate-300">admin123</span></p>
            </div> */}
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full relative">
            <button
              onClick={() => {
                setShowForgotPassword(false)
                setResetCodeSent(false)
                setForgotPasswordEmail('')
                setResetCode('')
                setNewPassword('')
                setConfirmPassword('')
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>

            {!resetCodeSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 mb-2">Forgot Password</h2>
                  <p className="text-sm text-slate-400">
                    Enter your email address and we'll send you a 6-digit code to reset your password.
                  </p>
                </div>

                <div>
                  <label htmlFor="forgotEmail" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="forgotEmail"
                    type="email"
                    required
                    className="form-input"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setForgotPasswordEmail('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="btn-primary flex-1"
                  >
                    {forgotPasswordLoading ? (
                      <span className="flex items-center justify-center">
                        <FaSpinner className="animate-spin mr-2" />
                        Sending...
                      </span>
                    ) : (
                      'Send Code'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 mb-2">Reset Password</h2>
                  <p className="text-sm text-slate-400">
                    Enter the 6-digit code sent to <span className="text-slate-300 font-semibold">{forgotPasswordEmail}</span> and your new password.
                  </p>
                </div>

                <div>
                  <label htmlFor="resetCode" className="form-label">
                    6-Digit Code
                  </label>
                  <input
                    id="resetCode"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="form-input text-center text-2xl tracking-widest"
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="form-label">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setResetCodeSent(false)
                      setResetCode('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetPasswordLoading || resetCode.length !== 6}
                    className="btn-primary flex-1"
                  >
                    {resetPasswordLoading ? (
                      <span className="flex items-center justify-center">
                        <FaSpinner className="animate-spin mr-2" />
                        Resetting...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
