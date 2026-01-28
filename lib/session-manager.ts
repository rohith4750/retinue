'use client'

import { SESSION_TIMEOUT, REMEMBER_ME_DURATION } from './constants'

let sessionTimeoutId: NodeJS.Timeout | null = null
let lastActivityTime = Date.now()
let isInitialized = false
let visibilityHandler: (() => void) | null = null

// Grace period after initialization before session checks (5 seconds)
const INITIALIZATION_GRACE_PERIOD = 5000

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
  
  // Mark as initialized after grace period
  isInitialized = false
  setTimeout(() => {
    isInitialized = true
  }, INITIALIZATION_GRACE_PERIOD)
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
  isInitialized = false
}

/**
 * Check if session is expired
 */
export function isSessionExpired(): boolean {
  // Don't report expired during initialization grace period
  if (!isInitialized) {
    return false
  }
  
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
  
  // Debounce reset to avoid excessive calls
  let resetDebounceId: NodeJS.Timeout | null = null
  const debouncedReset = () => {
    if (resetDebounceId) {
      clearTimeout(resetDebounceId)
    }
    resetDebounceId = setTimeout(() => {
      resetSessionTimeout(onTimeout)
    }, 100)
  }

  events.forEach((event) => {
    window.addEventListener(event, debouncedReset, { passive: true })
  })

  // Remove any existing visibility handler
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }

  // Create new visibility handler
  visibilityHandler = () => {
    if (!document.hidden) {
      // Only check expiration if we're initialized and past grace period
      if (isInitialized && isSessionExpired()) {
        onTimeout()
      } else {
        // Just update activity time, don't reset full timeout on tab switch
        lastActivityTime = Date.now()
      }
    }
  }

  document.addEventListener('visibilitychange', visibilityHandler)

  return () => {
    // Cleanup all event listeners
    events.forEach((event) => {
      window.removeEventListener(event, debouncedReset)
    })
    
    // Cleanup visibility handler
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
    
    // Clear debounce timer
    if (resetDebounceId) {
      clearTimeout(resetDebounceId)
    }
  }
}
