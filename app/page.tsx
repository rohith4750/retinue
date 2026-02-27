'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getToken, isLoggedIn, clearAuth, setAccessToken } from '@/lib/auth-storage'

export default function Home() {
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    const validateAndRedirect = async () => {
      let token = getToken()
      const loggedIn = isLoggedIn()

      if (!loggedIn) {
        router.push('/login')
        setIsValidating(false)
        return
      }

      // Recover access token on reload when refresh cookie is valid.
      if (!token) {
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json().catch(() => null)
            const refreshedToken = refreshData?.data?.accessToken
            if (refreshedToken) {
              setAccessToken(refreshedToken)
              token = refreshedToken
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
        }
      }

      if (!token) {
        clearAuth()
        router.push('/login')
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch('/api/auth/validate', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.status === 401 || !response.ok) {
          // One retry via refresh token before forcing login.
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json().catch(() => null)
            const refreshedToken = refreshData?.data?.accessToken
            if (refreshedToken) {
              setAccessToken(refreshedToken)
              const retry = await fetch('/api/auth/validate', {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${refreshedToken}`,
                  'Content-Type': 'application/json',
                },
              })
              if (retry.ok) {
                router.push('/dashboard')
                return
              }
            }
          }

          clearAuth()
          router.push('/login')
          setIsValidating(false)
          return
        }

        router.push('/dashboard')
      } catch (error) {
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
