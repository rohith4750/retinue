'use client'

import { SESSION_TIMEOUT, REMEMBER_ME_DURATION } from './constants'

let sessionTimeoutId: NodeJS.Timeout | null = null
let lastActivityTime = Date.now()

/**
 * Initialize session timeout
 */
export function initSessionTimeout(onTimeout: () => void) {
  // Clear existing timeout
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId)
  }

  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  const timeout = rememberMe ? REMEMBER_ME_DURATION : SESSION_TIMEOUT

  // Reset timeout
  sessionTimeoutId = setTimeout(() => {
    onTimeout()
  }, timeout)

  // Update last activity time
  lastActivityTime = Date.now()
}

/**
 * Reset session timeout on user activity
 */
export function resetSessionTimeout(onTimeout: () => void) {
  lastActivityTime = Date.now()
  initSessionTimeout(onTimeout)
}

/**
 * Clear session timeout
 */
export function clearSessionTimeout() {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId)
    sessionTimeoutId = null
  }
}

/**
 * Check if session is expired
 */
export function isSessionExpired(): boolean {
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  const timeout = rememberMe ? REMEMBER_ME_DURATION : SESSION_TIMEOUT
  const timeSinceLastActivity = Date.now() - lastActivityTime
  return timeSinceLastActivity > timeout
}

/**
 * Setup activity listeners for session management
 */
export function setupSessionListeners(onTimeout: () => void) {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  
  const resetTimeout = () => {
    resetSessionTimeout(onTimeout)
  }

  events.forEach((event) => {
    window.addEventListener(event, resetTimeout, { passive: true })
  })

  // Also reset on visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (isSessionExpired()) {
        onTimeout()
      } else {
        resetTimeout()
      }
    }
  })

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, resetTimeout)
    })
  }
}
