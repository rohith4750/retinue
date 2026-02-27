type RateLimitRecord = {
  count: number
  resetAt: number
}

const globalStore = globalThis as unknown as {
  __rateLimitStore?: Map<string, RateLimitRecord>
}

function getStore(): Map<string, RateLimitRecord> {
  if (!globalStore.__rateLimitStore) {
    globalStore.__rateLimitStore = new Map<string, RateLimitRecord>()
  }
  return globalStore.__rateLimitStore
}

export function getRateLimitState(key: string, maxAttempts: number, windowMs: number) {
  const now = Date.now()
  const store = getStore()
  const record = store.get(key)

  if (!record || record.resetAt <= now) {
    return {
      limited: false,
      remaining: maxAttempts,
      retryAfterMs: 0,
    }
  }

  const limited = record.count >= maxAttempts
  return {
    limited,
    remaining: Math.max(0, maxAttempts - record.count),
    retryAfterMs: limited ? Math.max(0, record.resetAt - now) : 0,
  }
}

export function incrementRateLimit(key: string, windowMs: number) {
  const now = Date.now()
  const store = getStore()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const record: RateLimitRecord = { count: 1, resetAt: now + windowMs }
    store.set(key, record)
    return record
  }

  const updated: RateLimitRecord = { ...existing, count: existing.count + 1 }
  store.set(key, updated)
  return updated
}

export function clearRateLimit(key: string) {
  getStore().delete(key)
}
