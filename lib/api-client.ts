import { API_BASE, API_TIMEOUT, ERROR_CODES } from './constants'

let refreshTokenPromise: Promise<string | null> | null = null

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  // Prevent multiple simultaneous refresh requests
  if (refreshTokenPromise) {
    return refreshTokenPromise
  }

  refreshTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include cookies
      })

      if (!response.ok) {
        // Refresh failed, clear auth
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return null
      }

      const data = await response.json()
      if (data.success && data.data?.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken)
        return data.data.accessToken
      }

      return null
    } catch (error) {
      console.error('Token refresh failed:', error)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      return null
    } finally {
      refreshTokenPromise = null
    }
  })()

  return refreshTokenPromise
}

/**
 * Enhanced API request with automatic token refresh
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const accessToken = localStorage.getItem('accessToken')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(accessToken && {
      Authorization: `Bearer ${accessToken}`,
    }),
    ...options.headers,
  }

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for refresh token
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && retryCount === 0) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        // Retry request with new token
        return apiRequest<T>(endpoint, options, retryCount + 1)
      }
    }

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.message || data.error || 'Request failed'
      const error = new Error(errorMessage)
      ;(error as any).response = {
        data,
        status: response.status,
        code: data.code || ERROR_CODES.SERVER_ERROR,
      }
      throw error
    }

    return data.data
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timeout')
      ;(timeoutError as any).response = {
        status: 408,
        code: ERROR_CODES.TIMEOUT,
      }
      throw timeoutError
    }

    // Network errors
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      const networkError = new Error('Network error. Please check your connection.')
      ;(networkError as any).response = {
        status: 0,
        code: ERROR_CODES.NETWORK_ERROR,
      }
      throw networkError
    }

    throw error
  }
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
