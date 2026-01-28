'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function Home() {
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    const validateAndRedirect = async () => {
      const user = localStorage.getItem('user')
      const accessToken = localStorage.getItem('accessToken')
      
      // If no credentials, go to login
      if (!user || !accessToken) {
        router.push('/login')
        return
      }
      
      // Validate token with server before redirecting to dashboard
      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.status === 401 || !response.ok) {
          // Token is invalid - clear storage and go to login
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          localStorage.removeItem('rememberMe')
          router.push('/login')
          return
        }
        
        // Token is valid - go to dashboard
        router.push('/dashboard')
      } catch (error) {
        // Network error - still try to go to dashboard (offline support)
        // AuthenticatedLayout will handle further validation
        router.push('/dashboard')
      } finally {
        setIsValidating(false)
      }
    }
    
    validateAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        {isValidating && (
          <p className="text-slate-400 mt-4 text-sm">Verifying session...</p>
        )}
      </div>
    </div>
  )
}
