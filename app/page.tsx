'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { getToken, isLoggedIn, clearAuth } from '@/lib/auth-storage'

export default function Home() {
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    const validateAndRedirect = async () => {
      const token = getToken()
      const loggedIn = isLoggedIn()

      if (!loggedIn || !token) {
        if (loggedIn) clearAuth()
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
