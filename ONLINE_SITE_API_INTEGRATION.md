# API Integration for hoteltheretinueonline.in

Use this from the **public website** (hoteltheretinueonline.in) to connect to the management backend API. All requests go to the **management site** base URL.

**Note:** The public endpoints (`/api/public/...`) must be implemented on the management backend; this doc is the **contract** for the online site UI. CORS for `/api/public/*` is already handled in this repo’s middleware when `ALLOWED_ORIGINS` is set.

---

## 1. Connection (Base URL)

| Environment | API Base URL |
|-------------|--------------|
| **Production** | `https://hoteltheretinue.in` |
| **Staging / Dev** | `https://your-staging-domain.com` or `http://localhost:3000` |

Use this as the **origin for all API calls**. No auth (no JWT) for public endpoints.

**Example (JavaScript / fetch):**
```js
const API_BASE = 'https://hoteltheretinue.in'  // or process.env.NEXT_PUBLIC_API_BASE

// Availability
const res = await fetch(`${API_BASE}/api/public/rooms/available?checkIn=2025-02-01T00:00:00.000Z&checkOut=2025-02-02T00:00:00.000Z`)
const data = await res.json()
```

**Example (React / env):**
```env
# .env (on hoteltheretinueonline.in)
NEXT_PUBLIC_API_BASE=https://hoteltheretinue.in
```
```js
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://hoteltheretinue.in'
```

---

## 2. Public API Endpoints

### 2.1 Check room availability (no auth)

**GET** `/api/public/rooms/available`

| Query param | Required | Description |
|-------------|----------|-------------|
| `checkIn`  | Yes | ISO date-time (e.g. `2025-02-01T00:00:00.000Z`) |
| `checkOut` | Yes | ISO date-time (e.g. `2025-02-02T00:00:00.000Z`) |
| `roomType` | No  | Filter by type (e.g. `DELUXE`, `SUITE`) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "...",
        "roomNumber": "101",
        "roomType": "DELUXE",
        "floor": 1,
        "basePrice": 3500,
        "capacity": 2,
        "status": "AVAILABLE"
      }
    ],
    "dateRange": { "checkIn": "...", "checkOut": "..." },
    "availableRoomCount": 5,
    "bookedRoomCount": 2
  }
}
```

---

### 2.2 Create booking (no auth)

**POST** `/api/public/bookings`  
**Content-Type:** `application/json`

**Body:**
```json
{
  "roomId": "room-cuid-here",
  "checkIn": "2025-02-01T14:00:00.000Z",
  "checkOut": "2025-02-02T11:00:00.000Z",
  "guestName": "Guest Name",
  "guestPhone": "9876543210",
  "guestEmail": "guest@example.com",
  "numberOfGuests": 2,
  "advanceAmount": 1000
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `roomId` | Yes | Room ID from availability response |
| `checkIn` | Yes | ISO date-time |
| `checkOut` | Yes | ISO date-time |
| `guestName` | Yes | Guest full name |
| `guestPhone` | Yes | Phone (used for “View my booking”) |
| `guestEmail` | No | Email |
| `numberOfGuests` | No | Default 1 |
| `advanceAmount` | No | Advance payment amount (default 0) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookingId": "RETINU0123",
    "bookingReference": "ABC12XY",
    "guest": { "name": "...", "phone": "..." },
    "room": { "roomNumber": "101", "roomType": "DELUXE" },
    "checkIn": "...",
    "checkOut": "...",
    "totalAmount": 3500,
    "paidAmount": 1000,
    "status": "CONFIRMED"
  }
}
```
Save **`bookingReference`** and show it to the guest for “View my booking”.

---

### 2.3 View my booking (no auth)

**GET** `/api/public/bookings/by-reference?reference=ABC12XY&phone=9876543210`

| Query param | Required | Description |
|-------------|----------|-------------|
| `reference` | Yes | Booking reference from create response |
| `phone`     | Yes | Guest phone (last 4 digits or full) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookingId": "RETINU0123",
    "bookingReference": "ABC12XY",
    "status": "CONFIRMED",
    "checkIn": "...",
    "checkOut": "...",
    "guest": { "name": "...", "phone": "..." },
    "room": { "roomNumber": "101", "roomType": "DELUXE" },
    "totalAmount": 3500,
    "paidAmount": 1000,
    "balanceAmount": 2500
  }
}
```

**Response (404):** Wrong reference or phone – do not expose booking details.

---

## 3. CORS (management site – hoteltheretinue.in)

The **management** app (this repo, deployed at hoteltheretinue.in) already sends CORS headers for `/api/public/*` when the request `Origin` is in the allow list.

**Set this on the management server (hoteltheretinue.in / Vercel):**

```env
ALLOWED_ORIGINS=https://hoteltheretinueonline.in,https://www.hoteltheretinueonline.in
```

For local dev (online site on port 3001):

```env
ALLOWED_ORIGINS=http://localhost:3001
```

Then the **online site UI** can call the API from the browser without CORS errors. Allowed headers/methods: `Content-Type`, `GET`, `POST`, `OPTIONS`.

---

## 4. Summary for UI (hoteltheretinueonline.in)

| Step | Endpoint | Method |
|------|----------|--------|
| 1. User picks dates | `/api/public/rooms/available?checkIn=...&checkOut=...` | GET |
| 2. User selects room, fills form, pays advance | `/api/public/bookings` | POST |
| 3. Show confirmation + `bookingReference` | (from POST response) | - |
| 4. “View my booking” | `/api/public/bookings/by-reference?reference=...&phone=...` | GET |

**Base URL:** `https://hoteltheretinue.in` (or your env variable).  
**Auth:** None for these public endpoints.
