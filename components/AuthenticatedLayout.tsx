'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  const sessionInitialized = useRef(false)
  const validationInProgress = useRef(false)

  // Pages that don't need authentication
  const publicPaths = ['/login', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path))

  // Clear auth and redirect to login
  const clearAuthAndRedirect = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    clearSessionTimeout()
    sessionInitialized.current = false
    router.push('/login')
  }, [router])

  // Session timeout handler - only trigger if actually authenticated and session was initialized
  const handleSessionTimeout = useCallback(() => {
    // Only show timeout if session was properly initialized
    if (!sessionInitialized.current) {
      return
    }
    
    toast.error('Session expired. Please login again.')
    clearAuthAndRedirect()
  }, [clearAuthAndRedirect])

  // Validate token with server using lightweight endpoint
  const validateToken = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      
      // If we get 401, token is invalid
      if (response.status === 401) {
        return false
      }
      
      // Any successful response means token is valid
      return response.ok
    } catch (error) {
      console.error('Token validation error:', error)
      return false
    }
  }, [])

  useEffect(() => {
    // Prevent duplicate validation
    if (validationInProgress.current) return
    
    if (isPublicPath) {
      setIsLoading(false)
      clearSessionTimeout() // Clear any existing timeout on public pages
      sessionInitialized.current = false
      return
    }

    const user = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')
    
    if (!user || !accessToken) {
      // Not authenticated - redirect to login without showing timeout message
      router.push('/login')
      setIsLoading(false)
      return
    }
    
    // Validate token with server
    validationInProgress.current = true
    validateToken(accessToken).then((isValid) => {
      validationInProgress.current = false
      
      if (!isValid) {
        // Token is invalid - clear and redirect
        console.log('Token validation failed, redirecting to login')
        clearAuthAndRedirect()
        setIsLoading(false)
        return
      }
      
      // Token is valid
      setIsAuthenticated(true)
      setIsLoading(false)
      
      // Initialize session timeout after a small delay to prevent race conditions
      setTimeout(() => {
        initSessionTimeout(handleSessionTimeout)
        sessionInitialized.current = true
      }, 500)
    }).catch(() => {
      validationInProgress.current = false
      // On error, still allow if we have local data (offline support)
      setIsAuthenticated(true)
      setIsLoading(false)
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
