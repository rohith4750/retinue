'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Edit booking is done on the booking detail page (modal).
 * This route redirects to the detail page so users stay on the same page.
 */
export default function EditBookingRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    if (id) router.replace(`/bookings/${id}`)
  }, [id, router])

  return null
}
