'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { Footer } from './Footer'
import { initSessionTimeout, setupSessionListeners, clearSessionTimeout } from '@/lib/session-manager'
import { getToken, isLoggedIn, clearAuth } from '@/lib/auth-storage'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const sessionInitialized = useRef(false)
  const validationInProgress = useRef(false)

  const publicPaths = ['/login', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path))

  const clearAuthAndRedirect = useCallback((reason?: string) => {
    clearAuth()
    clearSessionTimeout()
    sessionInitialized.current = false
    const url = reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login'
    router.push(url)
  }, [router])

  // 15 min idle → logout; redirect with ?reason=timeout so login page shows "Session expired" once
  const handleSessionTimeout = useCallback(() => {
    if (!sessionInitialized.current) return
    clearAuthAndRedirect('timeout')
  }, [clearAuthAndRedirect])

  const validateToken = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.status === 401) return false
      return response.ok
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }, [])

  useEffect(() => {
    if (validationInProgress.current) return

    if (isPublicPath) {
      setIsLoading(false)
      clearSessionTimeout()
      sessionInitialized.current = false
      return
    }

    const token = getToken()
    const loggedIn = isLoggedIn()

    if (!loggedIn || !token) {
      if (loggedIn && !token) clearAuth()
      router.push('/login')
      setIsLoading(false)
      return
    }

    validationInProgress.current = true
    validateToken(token).then((isValid) => {
      validationInProgress.current = false

      if (!isValid) {
        clearAuthAndRedirect('session_expired')
        setIsLoading(false)
        return
      }

      setIsAuthenticated(true)
      setIsLoading(false)
      setTimeout(() => {
        initSessionTimeout(handleSessionTimeout)
        sessionInitialized.current = true
      }, 500)
    }).catch((error) => {
      validationInProgress.current = false
      console.error('Token validation error (network/DB), allowing access:', error)
      setIsAuthenticated(true)
      setIsLoading(false)
      setTimeout(() => {
        initSessionTimeout(handleSessionTimeout)
        sessionInitialized.current = true
      }, 500)
    })
  }, [router, isPublicPath, handleSessionTimeout, validateToken, clearAuthAndRedirect])

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
      <div className="min-h-screen app-shell flex items-center justify-center">
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
    <div className="min-h-screen relative flex app-shell">
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
