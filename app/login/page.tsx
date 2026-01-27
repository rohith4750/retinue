'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { FaSpinner, FaTimes, FaEnvelope, FaLock, FaConciergeBell, FaStar, FaBuilding, FaHotel } from 'react-icons/fa'

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
    <div className="min-h-screen flex relative overflow-hidden bg-slate-950">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-80 h-80 bg-amber-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-sky-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-6000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Main Content */}
      <div className="w-full flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="max-w-5xl w-full flex flex-col lg:flex-row items-center lg:items-stretch gap-8 lg:gap-0">
          
          {/* Left Side - Branding (Hidden on mobile, shown on lg) */}
          <div className="hidden lg:flex lg:flex-1 flex-col justify-center items-center p-12 relative">
            {/* Logo Stack */}
            <div className="flex flex-col items-center space-y-6">
              {/* Combined Logo */}
              <div className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/40 transform -rotate-6">
                    <FaHotel className="text-2xl text-white" />
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-sky-500/40 transform rotate-6">
                    <FaBuilding className="text-2xl text-white" />
                  </div>
                </div>
                {/* Connecting Element */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700 shadow-lg">
                  <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-sky-400">&</span>
                </div>
              </div>

              {/* Brand Names */}
              <div className="text-center mt-4">
                <h1 className="text-3xl font-bold text-white mb-1">
                  The Retinue
                </h1>
                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4">
                  <div className="h-px w-8 bg-gradient-to-r from-transparent to-slate-600"></div>
                  <span>and</span>
                  <div className="h-px w-8 bg-gradient-to-l from-transparent to-slate-600"></div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Buchirajuu
                </h1>
                <p className="text-slate-500 text-sm tracking-wider uppercase">
                  Hotel & Convention Center
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className="w-4 h-4 text-amber-400" />
                ))}
              </div>

              {/* Tagline */}
              <p className="text-slate-500 text-center text-sm max-w-xs mt-4 leading-relaxed">
                Where luxury meets celebration. Your destination for unforgettable stays and extraordinary events.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:flex items-center px-4">
            <div className="w-px h-96 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:flex-1 flex items-center justify-center">
            <div className="max-w-md w-full">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3">
                    <FaHotel className="text-lg text-white" />
                  </div>
                  <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                    <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-sky-400">&</span>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                    <FaBuilding className="text-lg text-white" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-white">The Retinue & Buchirajuu</h1>
                <p className="text-slate-500 text-xs">Hotel & Convention Center</p>
              </div>

          {/* Login Card */}
          <div className="bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-white mb-1">
                The Hotel Retinue <span className="text-amber-400">&</span> Buchirajuu
              </h2>
              <p className="text-slate-500 text-xs uppercase tracking-wider">
                Hotel & Convention Management
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center text-sm">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-amber-500 bg-slate-800 border-white/20 rounded focus:ring-amber-500 focus:ring-2"
                    />
                    <label htmlFor="rememberMe" className="ml-2 text-sm text-slate-400">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
            
            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-slate-500">
                Protected by enterprise-grade security
              </p>
            </div>
          </div>
          
          {/* Copyright */}
          <p className="text-center text-xs text-slate-600 mt-6">
            © 2026 The Retinue & Buchirajuu. All rights reserved.
          </p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900/95 backdrop-blur-xl max-w-md w-full relative rounded-2xl border border-white/10 shadow-2xl p-8">
            <button
              onClick={() => {
                setShowForgotPassword(false)
                setResetCodeSent(false)
                setForgotPasswordEmail('')
                setResetCode('')
                setNewPassword('')
                setConfirmPassword('')
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>

            {!resetCodeSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-4 shadow-lg shadow-amber-500/20">
                    <FaEnvelope className="text-xl text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Forgot Password?</h2>
                  <p className="text-sm text-slate-400">
                    No worries! Enter your email and we'll send you a reset code.
                  </p>
                </div>

                <div>
                  <label htmlFor="forgotEmail" className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      id="forgotEmail"
                      type="email"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="Enter your email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setForgotPasswordEmail('')
                    }}
                    className="flex-1 py-3 px-4 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
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
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full mb-4 shadow-lg shadow-amber-500/20">
                    <FaLock className="text-xl text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
                  <p className="text-sm text-slate-400">
                    Enter the code sent to <span className="text-amber-400 font-medium">{forgotPasswordEmail}</span>
                  </p>
                </div>

                <div>
                  <label htmlFor="resetCode" className="block text-sm font-medium text-slate-300 mb-2">
                    6-Digit Code
                  </label>
                  <input
                    id="resetCode"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="w-full py-4 bg-slate-800/50 border border-white/10 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      id="newPassword"
                      type="password"
                      required
                      minLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                      className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
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
                    className="flex-1 py-3 px-4 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetPasswordLoading || resetCode.length !== 6}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
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
