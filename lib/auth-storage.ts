/**
 * Auth storage – matches your current React app flow.
 * sessionStorage.authToken → JWT access token (cleared when tab closes)
 * localStorage.isLogin, userRole, permissions → for route guard and UI
 */

const AUTH_TOKEN_KEY = 'authToken'
const IS_LOGIN_KEY = 'isLogin'
const USER_ROLE_KEY = 'userRole'
const PERMISSIONS_KEY = 'permissions'
const USER_KEY = 'user'
const REMEMBER_ME_KEY = 'rememberMe'

export type AuthUser = {
  id: string
  username: string
  email?: string | null
  role: string
}

/**
 * Derive permissions from role (simple: role-based; extend as needed)
 */
function getPermissionsForRole(role: string): string[] {
  const roleUpper = role.toUpperCase()
  if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN') {
    return ['*']
  }
  if (roleUpper === 'RECEPTIONIST') {
    return ['dashboard', 'bookings', 'rooms', 'bills', 'guests', 'profile']
  }
  if (roleUpper === 'STAFF') {
    return ['dashboard', 'profile']
  }
  return [role]
}

/**
 * Set auth after successful login.
 * Token in sessionStorage; flags and user in localStorage.
 */
export function setAuth(accessToken: string, user: AuthUser, rememberMe?: boolean): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(AUTH_TOKEN_KEY, accessToken)
  localStorage.setItem(IS_LOGIN_KEY, 'true')
  localStorage.setItem(USER_ROLE_KEY, user.role)
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(getPermissionsForRole(user.role)))
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (rememberMe) {
    localStorage.setItem(REMEMBER_ME_KEY, 'true')
  }
}

/**
 * Clear all auth data (logout / session expired).
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(IS_LOGIN_KEY)
  localStorage.removeItem(USER_ROLE_KEY)
  localStorage.removeItem(PERMISSIONS_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
  // Legacy keys used elsewhere
  localStorage.removeItem('accessToken')
  localStorage.removeItem('user')
  localStorage.removeItem('user_id')
  localStorage.removeItem('auth_token')
}

/**
 * Get JWT from sessionStorage (for API client).
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

/**
 * Route guard: is user considered logged in?
 */
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(IS_LOGIN_KEY) === 'true'
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_ROLE_KEY)
}

export function getPermissions(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
