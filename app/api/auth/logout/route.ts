import { cookies } from 'next/headers'
import { successResponse } from '@/lib/api-helpers'

export const runtime = 'nodejs'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('accessToken')
  cookieStore.delete('refreshToken')
  cookieStore.delete('csrfToken')

  return Response.json(successResponse({}, 'Logged out successfully'))
}
