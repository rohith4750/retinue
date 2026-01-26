# 🚀 Application Flow & Logic Improvements

## Executive Summary

This document outlines comprehensive improvements for the Hotel Management System's application flow, logic, security, performance, and maintainability. Recommendations are prioritized by impact and implementation complexity.

---

## 🔴 Critical Issues (High Priority)

### 1. **Server-Side Route Protection Missing**

**Current State:**
- Middleware only allows public routes but doesn't protect pages
- Client-side auth checks can be bypassed
- Pages are accessible without authentication

**Impact:** Security vulnerability - unauthorized access to protected pages

**Solution:**
```typescript
// middleware.ts - Add server-side protection
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/refresh', '/api/health']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // For API routes, let requireAuth() handle it
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For page routes, verify JWT token
  const authHeader = request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader) || 
                request.cookies.get('accessToken')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify user still exists
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true },
  })

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
```

**Alternative (Better):** Use Next.js 14+ server components with auth checks

---

### 2. **Environment Variable Validation Missing**

**Current State:**
- No validation on startup
- Missing env vars cause runtime errors
- No clear error messages

**Solution:**
```typescript
// lib/env-validation.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

// Call at app startup (app/layout.tsx or app/api/...)
validateEnv()
```

---

### 3. **Inconsistent Error Handling**

**Current State:**
- Some routes use custom error classes
- Some use generic error responses
- Inconsistent error codes and messages

**Solution:**
```typescript
// lib/api-error-handler.ts
import { NextRequest } from 'next/server'
import { errorResponse } from './api-helpers'
import { BookingError } from './booking-errors'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export function handleApiError(error: unknown, request: NextRequest) {
  // Log error for debugging
  console.error('API Error:', {
    error,
    path: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
  })

  // Custom application errors
  if (error instanceof BookingError) {
    return Response.json(
      errorResponse(error.code, error.message),
      { status: error.statusCode }
    )
  }

  // Validation errors
  if (error instanceof ZodError) {
    return Response.json(
      errorResponse(
        'VALIDATION_ERROR',
        error.errors[0]?.message || 'Validation failed',
        'VALIDATION_ERROR'
      ),
      { status: 400 }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return Response.json(
        errorResponse('DUPLICATE_ENTRY', 'A record with this value already exists'),
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

  // Generic error
  return Response.json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
    { status: 500 }
  )
}
```

---

### 4. **No Request Rate Limiting**

**Current State:**
- No protection against brute force attacks
- No protection against API abuse
- Login endpoint vulnerable

**Solution:**
```typescript
// lib/rate-limiter.ts
import { LRUCache } from 'lru-cache'

const rateLimitCache = new LRUCache<string, number[]>({
  max: 1000,
  ttl: 60 * 1000, // 1 minute
})

export function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const requests = rateLimitCache.get(identifier) || []

  // Remove old requests outside the window
  const recentRequests = requests.filter((time) => now - time < windowMs)

  if (recentRequests.length >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  recentRequests.push(now)
  rateLimitCache.set(identifier, recentRequests)

  return { allowed: true, remaining: maxRequests - recentRequests.length }
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const limit = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000) // 5 attempts per 15 minutes

  if (!limit.allowed) {
    return Response.json(
      errorResponse('RATE_LIMIT_EXCEEDED', 'Too many login attempts. Please try again later.'),
      { 
        status: 429,
        headers: {
          'Retry-After': '900', // 15 minutes
        },
      }
    )
  }
  // ... rest of login logic
}
```

---

## 🟡 Important Improvements (Medium Priority)

### 5. **Missing Input Sanitization**

**Current State:**
- No XSS protection
- No SQL injection protection (though Prisma helps)
- User input not sanitized

**Solution:**
```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeString(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as T[typeof key]
    }
  }
  return sanitized
}

// Usage
const sanitizedData = sanitizeObject(validatedData)
```

---

### 6. **No Request/Response Logging**

**Current State:**
- No audit trail for API requests
- Difficult to debug issues
- No monitoring

**Solution:**
```typescript
// lib/api-logger.ts
export function logApiRequest(
  request: NextRequest,
  response: Response,
  duration: number
) {
  const log = {
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for'),
  }

  // In production, send to logging service (e.g., Logtail, Datadog)
  if (process.env.NODE_ENV === 'production') {
    // Send to logging service
  } else {
    console.log('[API]', log)
  }
}

// Middleware wrapper
export function withLogging(handler: (req: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const start = Date.now()
    const response = await handler(request)
    const duration = Date.now() - start
    logApiRequest(request, response, duration)
    return response
  }
}
```

---

### 7. **Missing API Response Caching**

**Current State:**
- Every request hits database
- No caching for frequently accessed data
- Slow response times

**Solution:**
```typescript
// lib/cache.ts
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, { data: any; timestamp: number }>({
  max: 500,
  ttl: 5 * 60 * 1000, // 5 minutes
})

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (!cached) return null
  return cached.data as T
}

export function setCache<T>(key: string, data: T, ttl?: number): void {
  cache.set(key, { data, timestamp: Date.now() }, { ttl })
}

export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
    }
  }
}

// Usage in API routes
export async function GET(request: NextRequest) {
  const cacheKey = `rooms:${request.nextUrl.searchParams.toString()}`
  const cached = getCached(cacheKey)
  if (cached) {
    return Response.json(successResponse(cached))
  }

  const rooms = await prisma.room.findMany({ ... })
  setCache(cacheKey, rooms)
  return Response.json(successResponse(rooms))
}
```

---

### 8. **Inconsistent Pagination**

**Current State:**
- Bookings endpoint has pagination
- Rooms endpoint doesn't
- Other endpoints missing pagination

**Solution:**
```typescript
// lib/pagination.ts
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function parsePaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  return { page, limit }
}

export function createPaginationResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginationResult<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
      hasNext: params.page * params.limit < total,
      hasPrev: params.page > 1,
    },
  }
}
```

---

### 9. **No Database Query Optimization**

**Current State:**
- Some queries fetch unnecessary data
- Missing select statements
- No query result caching

**Solution:**
```typescript
// Always use select to fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    username: true,
    role: true,
    // Don't fetch password, createdAt, etc. if not needed
  },
})

// Use include carefully - avoid N+1 queries
const bookings = await prisma.booking.findMany({
  include: {
    room: {
      select: { roomNumber: true, roomType: true }, // Only needed fields
    },
    guest: {
      select: { name: true, phone: true },
    },
  },
})

// Use raw queries for complex aggregations
const stats = await prisma.$queryRaw`
  SELECT 
    status,
    COUNT(*) as count,
    SUM(totalAmount) as total
  FROM "Booking"
  WHERE "checkIn" >= ${startDate}
  GROUP BY status
`
```

---

### 10. **Missing Transaction Rollback Handling**

**Current State:**
- Transactions used but errors not always handled properly
- Partial failures possible

**Solution:**
```typescript
// Enhanced transaction wrapper
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      return await operation(tx)
    }, {
      maxWait: 5000, // Maximum time to wait for a transaction slot
      timeout: 10000, // Maximum time the transaction can run
    })
  } catch (error) {
    // Log transaction failure
    console.error('Transaction failed:', error)
    throw error
  }
}
```

---

## 🟢 Enhancement Features (Low Priority)

### 11. **API Versioning**

**Current State:**
- No API versioning
- Breaking changes affect all clients

**Solution:**
```typescript
// app/api/v1/bookings/route.ts
// app/api/v2/bookings/route.ts

// Or use headers
const apiVersion = request.headers.get('api-version') || 'v1'
```

---

### 12. **Request Validation Middleware**

**Current State:**
- Validation scattered across routes
- Inconsistent validation

**Solution:**
```typescript
// lib/validate-request.ts
import { z } from 'zod'

export function validateRequest<T extends z.ZodType>(
  schema: T
) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json()
      return schema.parse(body) as z.infer<T>
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(error.errors[0]?.message || 'Validation failed')
      }
      throw error
    }
  }
}

// Usage
const validatedData = await validateRequest(createBookingSchema)(request)
```

---

### 13. **Health Check Improvements**

**Current State:**
- Basic health check exists
- No dependency checks

**Solution:**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: await checkDatabase(),
      // Add other dependencies
    },
  }

  const allHealthy = Object.values(checks.dependencies).every((dep) => dep.status === 'ok')
  
  return Response.json(checks, {
    status: allHealthy ? 200 : 503,
  })
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', latency: Date.now() }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}
```

---

### 14. **Better Error Messages for Users**

**Current State:**
- Technical error messages shown to users
- Not user-friendly

**Solution:**
```typescript
// lib/user-friendly-errors.ts
const errorMessages: Record<string, string> = {
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'ROOM_UNAVAILABLE': 'This room is not available. Please select another room.',
  'DATE_CONFLICT': 'The room is already booked for these dates.',
  'UNAUTHORIZED': 'Please log in to continue.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'NOT_FOUND': 'The requested resource was not found.',
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
}

export function getUserFriendlyMessage(errorCode: string, defaultMessage?: string): string {
  return errorMessages[errorCode] || defaultMessage || 'An error occurred. Please try again.'
}
```

---

### 15. **Request Timeout Handling**

**Current State:**
- Client has timeout
- Server doesn't enforce timeouts

**Solution:**
```typescript
// lib/with-timeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ])
}

// Usage
const result = await withTimeout(
  prisma.booking.findMany({ ... }),
  5000 // 5 second timeout
)
```

---

## 📊 Performance Optimizations

### 16. **Database Connection Pooling**

**Current State:**
- Using default Prisma connection pool
- May not be optimized

**Solution:**
```typescript
// lib/prisma.ts
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Add connection pool configuration in DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

---

### 17. **Response Compression**

**Current State:**
- No response compression
- Large payloads slow

**Solution:**
```typescript
// next.config.js
const nextConfig = {
  compress: true,
  // ...
}
```

---

### 18. **Optimistic UI Updates**

**Current State:**
- UI waits for server response
- No optimistic updates

**Solution:**
```typescript
// Use React Query optimistic updates
const mutation = useMutation({
  mutationFn: updateBooking,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['bookings'])
    const previous = queryClient.getQueryData(['bookings'])
    queryClient.setQueryData(['bookings'], (old) => ({
      ...old,
      data: old.data.map((b) => b.id === newData.id ? { ...b, ...newData } : b),
    }))
    return { previous }
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['bookings'], context.previous)
  },
})
```

---

## 🔐 Security Enhancements

### 19. **CORS Configuration**

**Current State:**
- No explicit CORS config
- May allow unauthorized origins

**Solution:**
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

---

### 20. **Password Strength Validation**

**Current State:**
- Basic password validation
- No strength requirements

**Solution:**
```typescript
// lib/password-validation.ts
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

---

## 📝 Implementation Priority

### Phase 1 (Immediate - Security Critical)
1. ✅ Server-side route protection
2. ✅ Environment variable validation
3. ✅ Rate limiting
4. ✅ Input sanitization

### Phase 2 (Short-term - Important)
5. ✅ Consistent error handling
6. ✅ Request/response logging
7. ✅ API response caching
8. ✅ Consistent pagination

### Phase 3 (Medium-term - Enhancements)
9. ✅ Database query optimization
10. ✅ Transaction improvements
11. ✅ Health check improvements
12. ✅ User-friendly error messages

### Phase 4 (Long-term - Nice to Have)
13. ✅ API versioning
14. ✅ Request validation middleware
15. ✅ Response compression
16. ✅ Optimistic UI updates

---

## 🎯 Quick Wins (Easy to Implement)

1. **Add environment variable validation** - 30 minutes
2. **Implement consistent error handling** - 1 hour
3. **Add request logging** - 1 hour
4. **Implement rate limiting** - 2 hours
5. **Add input sanitization** - 1 hour

---

## 📚 Additional Recommendations

1. **Add TypeScript strict mode** - Catch more errors at compile time
2. **Implement unit tests** - Use Vitest or Jest
3. **Add E2E tests** - Use Playwright or Cypress
4. **Set up CI/CD** - Automated testing and deployment
5. **Add monitoring** - Use Sentry, LogRocket, or similar
6. **Documentation** - API documentation with OpenAPI/Swagger
7. **Code splitting** - Reduce bundle size
8. **Image optimization** - Use Next.js Image component
9. **SEO optimization** - Add meta tags, sitemap
10. **Accessibility** - WCAG compliance

---

## 🔄 Migration Strategy

1. **Start with Phase 1** - Security is critical
2. **Test thoroughly** - Each change in isolation
3. **Monitor performance** - Before and after metrics
4. **Document changes** - Update README and API docs
5. **Gradual rollout** - Feature flags for new functionality

---

*Last Updated: January 2026*
