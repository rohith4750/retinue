'use client'

import { IDLE_TIMEOUT_MS } from './constants'

let sessionTimeoutId: NodeJS.Timeout | null = null
let lastActivityTime = Date.now()
let isInitialized = false
let visibilityHandler: (() => void) | null = null

// Grace period after initialization before session checks (5 seconds)
const INITIALIZATION_GRACE_PERIOD = 5000

/**
 * Initialize session timeout (15 min idle → logout)
 */
export function initSessionTimeout(onTimeout: () => void) {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId)
  }

  sessionTimeoutId = setTimeout(() => {
    onTimeout()
  }, IDLE_TIMEOUT_MS)

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
 * Check if session is expired (idle past 15 min)
 */
export function isSessionExpired(): boolean {
  if (!isInitialized) {
    return false
  }
  const timeSinceLastActivity = Date.now() - lastActivityTime
  return timeSinceLastActivity > IDLE_TIMEOUT_MS
}

/**
 * Setup activity listeners for session management
 */
export function setupSessionListeners(onTimeout: () => void) {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  
  // Throttle reset to avoid excessive calls (max once per 10 seconds)
  let lastResetTimestamp = 0
  const throttleInterval = 10000 // 10 seconds

  const throttledReset = () => {
    const now = Date.now()
    if (now - lastResetTimestamp > throttleInterval) {
      lastResetTimestamp = now
      resetSessionTimeout(onTimeout)
    }
  }

  events.forEach((event) => {
    window.addEventListener(event, throttledReset, { passive: true })
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
        // Just update activity time
        const now = Date.now()
        if (now - lastResetTimestamp > throttleInterval) {
          lastResetTimestamp = now
          resetSessionTimeout(onTimeout)
        }
      }
    }
  }

  document.addEventListener('visibilitychange', visibilityHandler)

  return () => {
    // Cleanup all event listeners
    events.forEach((event) => {
      window.removeEventListener(event, throttledReset)
    })
    
    // Cleanup visibility handler
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }
}
