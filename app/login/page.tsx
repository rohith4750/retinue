'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import toast from 'react-hot-toast'
import { FaHotel, FaSpinner } from 'react-icons/fa'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store auth info
      localStorage.setItem('auth_token', 'token')
      localStorage.setItem('user_id', data.data.id)
      localStorage.setItem('user', JSON.stringify(data.data))

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
              Hotel Management System
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
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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

            <div className="text-center text-sm text-slate-400">
              <p>Default: <span className="font-semibold text-slate-300">admin</span> / <span className="font-semibold text-slate-300">admin123</span></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
