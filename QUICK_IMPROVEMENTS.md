# ⚡ Quick Improvements - Action Plan

## Top 5 Critical Improvements (Implement First)

### 1. 🔒 Environment Variable Validation (30 min)
**Why:** Prevents runtime errors and provides clear feedback

**File:** `lib/env-validation.ts` (create new)

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
})

export function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Missing environment variables:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      process.exit(1)
    }
  }
}

// Add to app/layout.tsx or middleware.ts
validateEnv()
```

---

### 2. 🛡️ Rate Limiting (1 hour)
**Why:** Prevents brute force attacks and API abuse

**File:** `lib/rate-limiter.ts` (create new)

```typescript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, number[]>({
  max: 1000,
  ttl: 60 * 1000,
})

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const requests = cache.get(key) || []
  const recent = requests.filter((time) => now - time < windowMs)

  if (recent.length >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  recent.push(now)
  cache.set(key, recent)
  return { allowed: true, remaining: maxRequests - recent.length }
}
```

**Usage in login route:**
```typescript
const ip = request.ip || 'unknown'
const limit = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000)

if (!limit.allowed) {
  return Response.json(
    errorResponse('RATE_LIMIT_EXCEEDED', 'Too many attempts'),
    { status: 429 }
  )
}
```

---

### 3. 🧹 Consistent Error Handling (1 hour)
**Why:** Better debugging and user experience

**File:** `lib/api-error-handler.ts` (create new)

```typescript
import { errorResponse } from './api-helpers'
import { BookingError } from './booking-errors'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function handleApiError(error: unknown) {
  console.error('API Error:', error)

  if (error instanceof BookingError) {
    return Response.json(
      errorResponse(error.code, error.message),
      { status: error.statusCode }
    )
  }

  if (error instanceof ZodError) {
    return Response.json(
      errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Validation failed'),
      { status: 400 }
    )
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return Response.json(
        errorResponse('DUPLICATE_ENTRY', 'Record already exists'),
        { status: 409 }
      )
    }
    if (error.code === 'P2025') {
      return Response.json(
        errorResponse('NOT_FOUND', 'Record not found'),
        { status: 404 }
      )
    }
  }

  return Response.json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
    { status: 500 }
  )
}
```

**Usage in all API routes:**
```typescript
export async function POST(request: NextRequest) {
  try {
    // ... your logic
  } catch (error) {
    return handleApiError(error)
  }
}
```

---

### 4. 📝 Request Logging (1 hour)
**Why:** Better debugging and monitoring

**File:** `lib/api-logger.ts` (create new)

```typescript
export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  userId?: string
) {
  const log = {
    method,
    path,
    status,
    duration: `${duration}ms`,
    userId,
    timestamp: new Date().toISOString(),
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[API]', log)
  }
  // In production, send to logging service
}

export function withLogging(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const start = Date.now()
    const response = await handler(request)
    const duration = Date.now() - start
    
    logRequest(
      request.method,
      request.nextUrl.pathname,
      response.status,
      duration
    )
    
    return response
  }
}
```

---

### 5. 🔍 Input Sanitization (1 hour)
**Why:** Prevents XSS attacks

**Install:** `npm install isomorphic-dompurify`

**File:** `lib/sanitize.ts` (create new)

```typescript
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as T[typeof key]
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as T[typeof key]
    }
  }
  return sanitized
}
```

**Usage:**
```typescript
const sanitizedData = sanitizeObject(validatedData)
```

---

## Implementation Checklist

- [ ] Create `lib/env-validation.ts` and call `validateEnv()` on startup
- [ ] Create `lib/rate-limiter.ts` and add to login route
- [ ] Create `lib/api-error-handler.ts` and use in all API routes
- [ ] Create `lib/api-logger.ts` and wrap API handlers
- [ ] Install `isomorphic-dompurify` and create `lib/sanitize.ts`
- [ ] Update all API routes to use error handler
- [ ] Add rate limiting to sensitive endpoints
- [ ] Test all changes

---

## Expected Impact

✅ **Security:** Rate limiting + sanitization = better protection
✅ **Reliability:** Environment validation = fewer runtime errors
✅ **Debugging:** Logging + error handling = easier troubleshooting
✅ **User Experience:** Better error messages = happier users

---

## Next Steps After Quick Wins

1. **Server-side route protection** - Protect pages from unauthorized access
2. **API response caching** - Improve performance
3. **Consistent pagination** - Better UX for large datasets
4. **Database query optimization** - Faster responses

See `APPLICATION_IMPROVEMENTS_ANALYSIS.md` for full details.
