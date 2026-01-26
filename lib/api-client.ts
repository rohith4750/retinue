const API_BASE = '/api'

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const userId = localStorage.getItem('user_id')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && userId && {
      Authorization: `Bearer ${userId}`,
    }),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    // Phase 2: Better error handling - extract message from API response
    const errorMessage = data.message || data.error || 'Request failed'
    const error = new Error(errorMessage)
    // Attach response data for better error handling
    ;(error as any).response = { data, status: response.status }
    throw error
  }

  return data.data
}

export const api = {
  get: <T = any>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: <T = any>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
}
