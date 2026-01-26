# 🏨 Booking System - Best Practices & Improvements Guide

## 📋 Table of Contents
1. [Data Integrity & Race Conditions](#1-data-integrity--race-conditions)
2. [Business Logic & Validation](#2-business-logic--validation)
3. [User Experience](#3-user-experience)
4. [Performance & Scalability](#4-performance--scalability)
5. [Error Handling & Resilience](#5-error-handling--resilience)
6. [Security & Authorization](#6-security--authorization)
7. [Audit Trail & Logging](#7-audit-trail--logging)
8. [API Design](#8-api-design)

---

## 1. Data Integrity & Race Conditions

### 🔴 Critical Issues

#### **1.1 Transaction Management**
**Problem:** Multiple database operations without transactions can cause data inconsistency.

**Current Code:**
```typescript
// Multiple separate operations - NOT ATOMIC
const booking = await prisma.booking.create({...})
await prisma.roomSlot.update({...})
await prisma.room.update({...})
await prisma.bill.create({...})
```

**Solution:**
```typescript
// Use Prisma transactions
await prisma.$transaction(async (tx) => {
  // 1. Check room availability (with lock)
  const room = await tx.room.findUnique({
    where: { id: roomId },
    // Lock row to prevent concurrent bookings
  })
  
  if (room.status !== 'AVAILABLE') {
    throw new Error('Room is not available')
  }
  
  // 2. Check for date conflicts
  const conflictingBooking = await tx.booking.findFirst({
    where: {
      roomId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      OR: [
        {
          checkIn: { lte: new Date(checkOut) },
          checkOut: { gte: new Date(checkIn) }
        }
      ]
    }
  })
  
  if (conflictingBooking) {
    throw new Error('Room already booked for these dates')
  }
  
  // 3. Create booking
  const booking = await tx.booking.create({...})
  
  // 4. Update room status
  await tx.room.update({
    where: { id: roomId },
    data: { status: 'BOOKED' }
  })
  
  // 5. Create bill
  await tx.bill.create({...})
  
  return booking
})
```

#### **1.2 Date Conflict Validation**
**Problem:** No validation for overlapping bookings.

**Solution:**
```typescript
// Add date conflict check
async function checkDateConflicts(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
) {
  const conflicts = await prisma.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      OR: [
        // Check-in overlaps
        {
          checkIn: { lte: checkOut },
          checkOut: { gte: checkIn }
        }
      ]
    }
  })
  
  return conflicts !== null
}
```

#### **1.3 Optimistic Locking**
**Problem:** Concurrent updates can overwrite each other.

**Solution:**
```typescript
// Add version field to schema
model Booking {
  id        String   @id @default(cuid())
  version   Int      @default(0)  // Add this
  // ... other fields
}

// Use version for optimistic locking
await prisma.booking.update({
  where: { 
    id: bookingId,
    version: currentVersion  // Fails if version changed
  },
  data: {
    status: newStatus,
    version: { increment: 1 }
  }
})
```

---

## 2. Business Logic & Validation

### **2.1 Date Validation**
```typescript
// Validate dates
function validateBookingDates(checkIn: Date, checkOut: Date) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  // Check-in must be in future (or today)
  if (checkIn < now) {
    throw new Error('Check-in date cannot be in the past')
  }
  
  // Check-out must be after check-in
  if (checkOut <= checkIn) {
    throw new Error('Check-out date must be after check-in date')
  }
  
  // Maximum stay limit (e.g., 30 days)
  const maxDays = 30
  const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  if (days > maxDays) {
    throw new Error(`Maximum stay is ${maxDays} days`)
  }
  
  return true
}
```

### **2.2 Room Availability Check**
```typescript
// Comprehensive availability check
async function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ available: boolean; reason?: string }> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          OR: [
            {
              checkIn: { lte: checkOut },
              checkOut: { gte: checkIn }
            }
          ]
        }
      }
    }
  })
  
  if (!room) {
    return { available: false, reason: 'Room not found' }
  }
  
  if (room.status === 'MAINTENANCE') {
    return { available: false, reason: 'Room is under maintenance' }
  }
  
  if (room.bookings.length > 0) {
    return { available: false, reason: 'Room is already booked for these dates' }
  }
  
  return { available: true }
}
```

### **2.3 Price Calculation**
```typescript
// Centralized price calculation
function calculateBookingPrice(
  room: Room,
  checkIn: Date,
  checkOut: Date,
  discount: number = 0
) {
  const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  const baseAmount = room.basePrice * days
  const discountAmount = Math.min(discount, baseAmount * 0.5) // Max 50% discount
  const subtotal = baseAmount - discountAmount
  const tax = subtotal * 0.18 // 18% GST
  const totalAmount = subtotal + tax
  
  return {
    days,
    baseAmount,
    discountAmount,
    subtotal,
    tax,
    totalAmount
  }
}
```

### **2.4 Booking Status State Machine**
```typescript
// Enforce valid status transitions
const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [], // Terminal state
  CANCELLED: [] // Terminal state
}

function canTransitionStatus(
  currentStatus: BookingStatus,
  newStatus: BookingStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}
```

---

## 3. User Experience

### **3.1 Real-time Availability**
```typescript
// Show real-time availability in UI
const { data: availability } = useQuery({
  queryKey: ['room-availability', roomId, checkIn, checkOut],
  queryFn: () => api.get(`/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`),
  refetchInterval: 30000, // Refresh every 30 seconds
  enabled: !!roomId && !!checkIn && !!checkOut
})
```

### **3.2 Booking Confirmation**
```typescript
// Send confirmation email/SMS
async function sendBookingConfirmation(booking: Booking) {
  // Send email
  await sendEmail({
    to: booking.guest.email,
    subject: 'Booking Confirmation',
    template: 'booking-confirmation',
    data: booking
  })
  
  // Send SMS
  await sendSMS({
    to: booking.guest.phone,
    message: `Your booking #${booking.id} is confirmed. Check-in: ${booking.checkIn}`
  })
}
```

### **3.3 Booking Modifications**
```typescript
// Allow booking modifications
async function modifyBooking(
  bookingId: string,
  changes: {
    checkIn?: Date
    checkOut?: Date
    roomId?: string
  }
) {
  // Check if modification is allowed
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  })
  
  if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
    throw new Error('Cannot modify completed or cancelled booking')
  }
  
  // Recalculate price if dates changed
  if (changes.checkIn || changes.checkOut) {
    // Recalculate and update bill
  }
  
  // Update booking
  return await prisma.booking.update({
    where: { id: bookingId },
    data: changes
  })
}
```

### **3.4 Early Check-in / Late Check-out**
```typescript
// Handle early check-in and late check-out charges
function calculateAdditionalCharges(
  booking: Booking,
  actualCheckIn?: Date,
  actualCheckOut?: Date
) {
  const charges = []
  
  // Early check-in (before 2 PM)
  if (actualCheckIn && actualCheckIn < new Date(booking.checkIn)) {
    const hoursEarly = (booking.checkIn.getTime() - actualCheckIn.getTime()) / (1000 * 60 * 60)
    if (hoursEarly > 2) {
      charges.push({
        type: 'EARLY_CHECKIN',
        amount: booking.room.basePrice * 0.5, // 50% of daily rate
        description: `Early check-in (${hoursEarly} hours)`
      })
    }
  }
  
  // Late check-out (after 11 AM)
  if (actualCheckOut && actualCheckOut > new Date(booking.checkOut)) {
    const hoursLate = (actualCheckOut.getTime() - booking.checkOut.getTime()) / (1000 * 60 * 60)
    if (hoursLate > 1) {
      charges.push({
        type: 'LATE_CHECKOUT',
        amount: booking.room.basePrice * 0.5,
        description: `Late check-out (${hoursLate} hours)`
      })
    }
  }
  
  return charges
}
```

---

## 4. Performance & Scalability

### **4.1 Database Indexing**
```prisma
// Add indexes for common queries
model Booking {
  id          String   @id @default(cuid())
  roomId      String
  guestId     String
  checkIn     DateTime
  checkOut    DateTime
  status      BookingStatus
  
  // Add indexes
  @@index([roomId, status])
  @@index([guestId])
  @@index([checkIn, checkOut])
  @@index([status, checkIn])
}
```

### **4.2 Pagination**
```typescript
// Add pagination to bookings list
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit
  
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      skip,
      take: limit,
      include: { room: true, guest: true, bill: true },
      orderBy: { bookingDate: 'desc' }
    }),
    prisma.booking.count()
  ])
  
  return Response.json({
    data: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
}
```

### **4.3 Caching Strategy**
```typescript
// Cache room availability
const availabilityCache = new Map<string, { data: any; expires: number }>()

async function getRoomAvailability(roomId: string, date: Date) {
  const cacheKey = `${roomId}-${date.toISOString().split('T')[0]}`
  const cached = availabilityCache.get(cacheKey)
  
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  
  const availability = await calculateAvailability(roomId, date)
  availabilityCache.set(cacheKey, {
    data: availability,
    expires: Date.now() + 60000 // 1 minute cache
  })
  
  return availability
}
```

---

## 5. Error Handling & Resilience

### **5.1 Comprehensive Error Handling**
```typescript
// Custom error classes
class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message)
    this.name = 'BookingError'
  }
}

class RoomUnavailableError extends BookingError {
  constructor(roomId: string) {
    super(`Room ${roomId} is not available`, 'ROOM_UNAVAILABLE', 409)
  }
}

// Use in API
try {
  const booking = await createBooking(data)
  return Response.json(successResponse(booking))
} catch (error) {
  if (error instanceof BookingError) {
    return Response.json(
      errorResponse(error.code, error.message),
      { status: error.statusCode }
    )
  }
  // Log unexpected errors
  console.error('Unexpected error:', error)
  return Response.json(
    errorResponse('INTERNAL_ERROR', 'An unexpected error occurred'),
    { status: 500 }
  )
}
```

### **5.2 Retry Logic for Failed Operations**
```typescript
// Retry mechanism for critical operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
  throw new Error('Max retries exceeded')
}
```

---

## 6. Security & Authorization

### **6.1 Input Validation & Sanitization**
```typescript
// Use Zod for validation
import { z } from 'zod'

const createBookingSchema = z.object({
  roomId: z.string().min(1),
  guestName: z.string().min(2).max(100),
  guestPhone: z.string().regex(/^[0-9]{10}$/),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  discount: z.number().min(0).max(100000).optional()
})

// Validate in API
const validationResult = createBookingSchema.safeParse(data)
if (!validationResult.success) {
  return Response.json(
    errorResponse('VALIDATION_ERROR', validationResult.error.message),
    { status: 400 }
  )
}
```

### **6.2 Rate Limiting**
```typescript
// Prevent booking spam
const bookingLimits = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userBookings = bookingLimits.get(userId) || []
  const recentBookings = userBookings.filter(time => now - time < 60000) // Last minute
  
  if (recentBookings.length >= 5) {
    return false // Too many bookings in short time
  }
  
  userBookings.push(now)
  bookingLimits.set(userId, userBookings.slice(-10)) // Keep last 10
  return true
}
```

---

## 7. Audit Trail & Logging

### **7.1 Booking History**
```typescript
// Track all booking changes
model BookingHistory {
  id          String   @id @default(cuid())
  bookingId   String
  action      String   // CREATED, UPDATED, CANCELLED, etc.
  changedBy   String   // User ID
  changes     Json     // What changed
  timestamp   DateTime @default(now())
  
  booking     Booking  @relation(fields: [bookingId], references: [id])
}

// Log changes
async function logBookingChange(
  bookingId: string,
  action: string,
  userId: string,
  changes: any
) {
  await prisma.bookingHistory.create({
    data: {
      bookingId,
      action,
      changedBy: userId,
      changes
    }
  })
}
```

---

## 8. API Design

### **8.1 RESTful Endpoints**
```typescript
// Better API structure
GET    /api/bookings              // List bookings (with filters)
POST   /api/bookings              // Create booking
GET    /api/bookings/:id          // Get booking details
PUT    /api/bookings/:id          // Update booking
DELETE /api/bookings/:id          // Cancel booking
POST   /api/bookings/:id/checkin  // Check in
POST   /api/bookings/:id/checkout // Check out
GET    /api/bookings/:id/bill     // Get bill
```

### **8.2 Webhooks for Events**
```typescript
// Notify external systems
async function triggerWebhook(event: string, data: any) {
  const webhooks = await getWebhooksForEvent(event)
  
  await Promise.allSettled(
    webhooks.map(webhook =>
      fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, data })
      })
    )
  )
}

// Trigger on booking events
await triggerWebhook('booking.created', booking)
await triggerWebhook('booking.checked_in', booking)
```

---

## 🎯 Priority Implementation Order

### **Phase 1: Critical (Do First)**
1. ✅ Transaction management for booking creation
2. ✅ Date conflict validation
3. ✅ Room availability check
4. ✅ Input validation with Zod

### **Phase 2: Important (Do Next)**
5. ✅ Booking status state machine
6. ✅ Comprehensive error handling
7. ✅ Pagination for bookings list
8. ✅ Database indexes

### **Phase 3: Enhancement (Nice to Have)**
9. ✅ Real-time availability updates
10. ✅ Booking modifications
11. ✅ Early check-in / late check-out charges
12. ✅ Audit trail / booking history

---

## 📝 Quick Wins

1. **Add date validation** - Prevent invalid bookings
2. **Add transaction wrapper** - Ensure data consistency
3. **Add conflict checking** - Prevent double bookings
4. **Add pagination** - Improve performance
5. **Add better error messages** - Improve UX

---

## 🔧 Implementation Example

See `BOOKING_IMPROVEMENTS_IMPLEMENTATION.md` for step-by-step implementation guide.
