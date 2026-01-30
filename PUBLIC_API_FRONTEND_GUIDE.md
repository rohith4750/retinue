# Public API – Frontend Guide

Use this from your **customer-facing site** (e.g. hoteltheretinueonline.in) to talk to the **management API** (e.g. hoteltheretinue.in). No auth; CORS is enabled for allowed origins.

**Base URL:** `https://hoteltheretinue.in` (or your API origin)  
**Prefix:** `/api/public`

---

## Response envelope (all endpoints)

**Success (2xx):**
```json
{
  "success": true,
  "data": { ... },
  "message": "optional string"
}
```

**Error (4xx/5xx):**
```json
{
  "success": false,
  "error": "Error code or short message",
  "message": "Human-readable message",
  "code": "optional code"
}
```

Always check `response.success` and use `response.data` when `success === true`. On error, show `response.message` (or `response.error`).

---

## 1. Get available rooms

**Purpose:** Show rooms and which are available for the selected dates (and optional room type).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/public/rooms/available` |

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `checkIn` | string | No* | Date: `YYYY-MM-DD` or ISO datetime |
| `checkOut` | string | No* | Date: `YYYY-MM-DD` or ISO datetime |
| `roomType` | string | No | Filter: `SINGLE`, `DOUBLE`, `DELUXE`, `STANDARD`, `SUITE`, `SUITE_PLUS` |

\* If both `checkIn` and `checkOut` are omitted, you get all non‑maintenance rooms with no date filter.

### Example request

```
GET /api/public/rooms/available?checkIn=2025-02-01&checkOut=2025-02-02
GET /api/public/rooms/available?checkIn=2025-02-01&checkOut=2025-02-02&roomType=DOUBLE
```

### Success response (200)

```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "room-cuid",
        "roomNumber": "101",
        "roomType": "DOUBLE",
        "floor": 1,
        "basePrice": 2500,
        "capacity": 2,
        "status": "AVAILABLE",
        "maintenanceReason": null,
        "createdAt": "...",
        "updatedAt": "...",
        "checkInAt": null,
        "checkOutAt": null
      },
      {
        "id": "room-cuid-2",
        "roomNumber": "102",
        "roomType": "DOUBLE",
        "floor": 1,
        "basePrice": 2500,
        "capacity": 2,
        "status": "BOOKED",
        "checkInAt": "2025-02-01T00:00:00.000Z",
        "checkOutAt": "2025-02-02T23:59:59.999Z"
      }
    ],
    "dateRange": {
      "checkIn": "2025-02-01T00:00:00.000Z",
      "checkOut": "2025-02-02T23:59:59.999Z"
    },
    "bookedRoomCount": 1,
    "availableRoomCount": 2
  }
}
```

- **rooms[].status:** `AVAILABLE` | `BOOKED` | `MAINTENANCE`
- When no dates are sent, `dateRange` is `null` and counts reflect all non‑maintenance rooms.

### Error response (400)

```json
{
  "success": false,
  "error": "INVALID_DATE",
  "message": "Check-out must be after check-in"
}
```

---

## 2. Create booking (public)

**Purpose:** Create a booking from the customer site. Source is set to `ONLINE`; you get `bookingId` and `bookingReference` for confirmation and “view my booking”.

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/public/bookings` |
| **Content-Type** | `application/json` |

### Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | string | Yes | Room ID from availability response |
| `guestName` | string | Yes | 2–100 chars |
| `guestPhone` | string | Yes | 10 digits (Indian mobile) |
| `checkIn` | string | Yes | `YYYY-MM-DD` or ISO datetime |
| `checkOut` | string | Yes | `YYYY-MM-DD` or ISO datetime |
| `guestIdProof` | string | No | ID number |
| `guestAddress` | string | No | Address text |
| `numberOfGuests` | number | No | Default 1 |
| `discount` | number | No | Default 0 |
| `advanceAmount` | number | No | Default 0 |
| `applyGst` | boolean | No | Default true |
| `flexibleCheckout` | boolean | No | Default false |

### Example request body

```json
{
  "roomId": "clxx...",
  "guestName": "John Doe",
  "guestPhone": "9876543210",
  "checkIn": "2025-02-01",
  "checkOut": "2025-02-02",
  "guestAddress": "123 Main St",
  "numberOfGuests": 2
}
```

### Success response (201)

```json
{
  "success": true,
  "data": {
    "bookingId": "RETINU0123",
    "bookingReference": "ABC12XY7",
    "guestName": "John Doe",
    "guestPhone": "9876543210",
    "checkIn": "2025-02-01T00:00:00.000Z",
    "checkOut": "2025-02-02T23:59:59.999Z",
    "roomNumber": "101",
    "roomType": "DOUBLE",
    "totalAmount": 2950,
    "status": "CONFIRMED",
    "message": "Booking created. Save your booking reference to view your booking."
  }
}
```

**Frontend:** Store and show `bookingReference` (and optionally `bookingId`) so the guest can use “View my booking” later.

### Error responses

**400 – Validation**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Phone must be 10 digits"
}
```

**409 – Room/date**
```json
{
  "success": false,
  "error": "ROOM_UNAVAILABLE",
  "message": "Room 101 is under maintenance"
}
```
```json
{
  "success": false,
  "error": "DATE_CONFLICT",
  "message": "Room 101 is already booked for the selected dates"
}
```

---

## 3. View booking by reference

**Purpose:** “View my booking”: show booking details using reference + phone (no login).

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/api/public/bookings/by-reference` |

### Query parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `bookingReference` | string | Yes | Short code from create response (e.g. `ABC12XY7`). Case-insensitive. |
| `phone` | string | Yes | Guest phone: full 10 digits or last 4 digits |

### Example request

```
GET /api/public/bookings/by-reference?bookingReference=ABC12XY7&phone=9876543210
GET /api/public/bookings/by-reference?bookingReference=ABC12XY7&phone=3210
```

### Success response (200)

```json
{
  "success": true,
  "data": {
    "bookingId": "RETINU0123",
    "bookingReference": "ABC12XY7",
    "checkIn": "2025-02-01T00:00:00.000Z",
    "checkOut": "2025-02-02T23:59:59.999Z",
    "status": "CONFIRMED",
    "paymentStatus": "PENDING",
    "totalAmount": 2950,
    "paidAmount": 0,
    "balanceAmount": 2950,
    "guestName": "John Doe",
    "guestPhone": "9876543210",
    "roomNumber": "101",
    "roomType": "DOUBLE",
    "numberOfGuests": 2
  }
}
```

### Error responses

**400**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "bookingReference and phone are required"
}
```

**404**
```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Booking not found"
}
```

**403**
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Phone does not match this booking"
}
```

---

## 4. OTP sign-up (Fast2SMS)

**Purpose:** Customer sign-up using OTP sent via Fast2SMS. Flow: send OTP → verify OTP → complete sign-up with name/email/address.

### 4.1 Send OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/public/auth/send-otp` |

**Body:** `{ "phone": "9876543210" }` (10 digits)

**Success (200):**
```json
{ "success": true, "data": { "expiresIn": 600 }, "message": "OTP sent to your mobile number" }
```

**Errors:** 400 (invalid phone), 429 (rate limit: wait 60s), 502/503 (SMS failed / not configured).

### 4.2 Verify OTP

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/public/auth/verify-otp` |

**Body:** `{ "phone": "9876543210", "otp": "123456" }`

**Success (200):**
```json
{ "success": true, "data": { "signupToken": "eyJ...", "phone": "9876543210", "expiresIn": 600 } }
```

**Errors:** 400 (invalid/expired OTP). Save `data.signupToken` for the next step (valid 10 minutes).

### 4.3 Complete sign-up (customer details)

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/api/public/auth/signup` |
| **Header** | `Authorization: Bearer <signupToken>` |

**Body:** `{ "name": "John Doe", "email": "john@example.com", "address": "123 Main St" }` — `name` required; `email`, `address` optional.

**Success (201):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "...",
      "phone": "9876543210",
      "name": "John Doe",
      "email": "john@example.com",
      "address": "123 Main St",
      "createdAt": "..."
    }
  },
  "message": "Sign up successful"
}
```

**Errors:** 401 (invalid/expired token), 400 (e.g. name too short).

---

## Implementation approaches

### 1. OTP sign-up flow

1. **Phone** – User enters 10-digit mobile; call `POST /api/public/auth/send-otp` with `{ phone }`.
2. **OTP** – User enters OTP; call `POST /api/public/auth/verify-otp` with `{ phone, otp }`; store `data.signupToken`.
3. **Details** – User enters name (required), email, address; call `POST /api/public/auth/signup` with `Authorization: Bearer <signupToken>` and body `{ name, email?, address? }`.
4. **Done** – Show `data.customer`; optionally use customer for pre-filling bookings or “My account”.

### 2. Booking flow (main journey)

1. **Dates + room type (optional)**  
   User picks check‑in, check‑out, and optionally room type.

2. **Fetch availability**  
   `GET /api/public/rooms/available?checkIn=...&checkOut=...&roomType=...`  
   Show only rooms with `status === 'AVAILABLE'`; use `roomNumber`, `roomType`, `basePrice`, `id` (for booking).

3. **Guest picks a room**  
   User selects one room (use its `id` as `roomId`).

4. **Collect guest details**  
   Form: `guestName`, `guestPhone` (10 digits), optional `guestAddress`, `numberOfGuests`, etc.

5. **Create booking**  
   `POST /api/public/bookings` with `roomId`, dates, and guest fields.  
   Body: same dates and `roomId`; don’t re-use stale availability.

6. **Confirmation page**  
   On success, show:
   - “Booking confirmed”
   - `data.bookingReference` (prominent) and optionally `data.bookingId`
   - Dates, room, guest, amount
   - “Save your booking reference” and link/button to “View my booking”

7. **Errors**  
   Use `response.message` for validation (e.g. phone), room unavailable, or date conflict. Retry with different dates/room if needed.

### 3. “View my booking” flow

1. **Form**  
   Two inputs: **Booking reference** (short code) and **Phone number** (full or last 4 digits).

2. **Request**  
   `GET /api/public/bookings/by-reference?bookingReference=...&phone=...`  
   Trim and uppercase reference on frontend if you want; backend uppercases.

3. **Success**  
   Show `data`: dates, status, payment, room, guest. Optionally show “Book another room” linking back to step 1 of booking flow.

4. **Errors**  
   - 404: “Booking not found” (wrong reference or not yet synced).  
   - 403: “Phone does not match” (wrong phone).

### 4. Frontend code patterns

**Base URL and fetch helper (example):**
```js
const API_BASE = 'https://hoteltheretinue.in/api/public';

async function publicApi(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, ...json };
  return json;
}
```

**Check availability:**
```js
const params = new URLSearchParams({
  checkIn: '2025-02-01',
  checkOut: '2025-02-02',
  // roomType: 'DOUBLE' // optional
});
const { data } = await publicApi(`/rooms/available?${params}`);
// data.rooms, data.availableRoomCount, data.dateRange
```

**Create booking:**
```js
const { data } = await publicApi('/bookings', {
  method: 'POST',
  body: JSON.stringify({
    roomId: selectedRoomId,
    guestName: form.guestName,
    guestPhone: form.guestPhone,
    checkIn: form.checkIn,
    checkOut: form.checkOut,
    guestAddress: form.guestAddress,
    numberOfGuests: form.numberOfGuests || 1,
  }),
});
// data.bookingReference, data.bookingId, data.roomNumber, data.totalAmount, etc.
```

**View by reference:**
```js
const params = new URLSearchParams({
  bookingReference: form.reference.trim().toUpperCase(),
  phone: form.phone.trim(),
});
const { data } = await publicApi(`/bookings/by-reference?${params}`);
// data.bookingId, data.checkIn, data.status, data.roomNumber, etc.
```

**OTP sign-up (3 steps):**
```js
// 1. Send OTP
await publicApi('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: '9876543210' }) });

// 2. Verify OTP → get signupToken
const { data: verifyData } = await publicApi('/auth/verify-otp', {
  method: 'POST',
  body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
});
const signupToken = verifyData.signupToken;

// 3. Complete sign-up with customer details
const { data } = await publicApi('/auth/signup', {
  method: 'POST',
  headers: { Authorization: `Bearer ${signupToken}` },
  body: JSON.stringify({ name: 'John Doe', email: 'j@example.com', address: '123 St' }),
});
// data.customer = { id, phone, name, email, address, createdAt }
```

---

## CORS

The API allows origins listed in `ALLOWED_ORIGINS` (e.g. `https://hoteltheretinueonline.in`). If your frontend origin is not allowed, browser will block the request; add your domain to `ALLOWED_ORIGINS` on the server.

---

## Summary table

| Action | Method | Endpoint | Request | Key response fields |
|--------|--------|----------|---------|----------------------|
| List/check rooms | GET | `/api/public/rooms/available` | Query: `checkIn`, `checkOut`, `roomType?` | `data.rooms`, `data.availableRoomCount` |
| Create booking | POST | `/api/public/bookings` | Body: `roomId`, `guestName`, `guestPhone`, `checkIn`, `checkOut`, ... | `data.bookingId`, `data.bookingReference` |
| View my booking | GET | `/api/public/bookings/by-reference` | Query: `bookingReference`, `phone` | `data` = full booking summary |
| Send OTP | POST | `/api/public/auth/send-otp` | Body: `{ "phone": "10digits" }` | `data.expiresIn`, `message` |
| Verify OTP | POST | `/api/public/auth/verify-otp` | Body: `{ "phone", "otp" }` | `data.signupToken`, `data.phone` |
| Complete sign-up | POST | `/api/public/auth/signup` | Header: `Bearer <signupToken>`, Body: `{ "name", "email?", "address?" }` | `data.customer` |
