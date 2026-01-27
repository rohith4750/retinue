'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { Footer } from './Footer'
import { initSessionTimeout, setupSessionListeners, clearSessionTimeout } from '@/lib/session-manager'
import toast from 'react-hot-toast'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Pages that don't need authentication
  const publicPaths = ['/login', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path))

  // Session timeout handler
  const handleSessionTimeout = useCallback(() => {
    toast.error('Session expired. Please login again.')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    clearSessionTimeout()
    router.push('/login')
  }, [router])

  useEffect(() => {
    if (isPublicPath) {
      setIsLoading(false)
      clearSessionTimeout() // Clear any existing timeout on public pages
      return
    }

    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
    } else {
      setIsAuthenticated(true)
      // Initialize session timeout after authentication is confirmed
      initSessionTimeout(handleSessionTimeout)
    }
    setIsLoading(false)
  }, [router, isPublicPath, handleSessionTimeout])

  // Setup session listeners when authenticated
  useEffect(() => {
    if (isAuthenticated && !isPublicPath) {
      const cleanup = setupSessionListeners(handleSessionTimeout)
      return () => {
        cleanup()
        clearSessionTimeout()
      }
    }
  }, [isAuthenticated, isPublicPath, handleSessionTimeout])

  // For public pages, just render children
  if (isPublicPath) {
    return <>{children}</>
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Authenticated layout
  return (
    <div className="min-h-screen relative flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Toolbar - Fixed */}
        <Toolbar />
        
        {/* Page content - with padding for fixed toolbar and footer */}
        <main className="flex-1 pt-16 pb-12">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
