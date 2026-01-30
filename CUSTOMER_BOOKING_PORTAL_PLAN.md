# Plan: Customer Booking Portal (Online Booking for Guests)

## Goal
A **customer-facing website/portal** where guests can:
1. **Book a room online** (check availability, select room, enter details, pay advance).
2. **Access their booking** after booking (view details, cancel/modify within policy, pay balance).

---

## 1. Two Ways to Structure It

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Same app, separate routes** | e.g. `/book` (public), `/my-booking` (public with booking ref) inside current Next.js app | One codebase, shared API, same deploy | Public and staff routes live together; need clear separation |
| **B. Separate app/subdomain** | e.g. `book.yourhotel.com` or separate repo | Clear separation, different branding/theming | Two deploys, shared API only |

**Recommendation:** Start with **Option A** (same app, public routes under `/book` and `/my-booking`). Add a second app later if you need different branding or domain.

---

## 2. What Exists Today (Backend)

- **Rooms & availability:** `GET /api/rooms/available?checkIn=...&checkOut=...` — currently **requires staff auth**.
- **Create booking:** `POST /api/bookings` — creates guest + booking + bill; **requires staff auth**.
- **Booking detail:** `GET /api/bookings/[id]` — **requires staff auth**.
- **Guest model:** name, phone, idProof, guestType (WALK_IN, OTA, etc.), address.

So for customers you need **public (or guest-scoped) APIs** that don’t use staff JWT.

---

## 3. Plan in Steps

### Phase 1: Public “Book a room” flow (no customer login)

1. **Public availability API**
   - New route, e.g. `GET /api/public/rooms/available?checkIn=...&checkOut=...` (no auth).
   - Same logic as current rooms/available: return list of available rooms with types and prices.
   - Optional: rate limit by IP to avoid abuse.

2. **Public “create booking” API**
   - New route, e.g. `POST /api/public/bookings`.
   - Input: checkIn, checkOut, roomId(s), guest (name, phone, email optional), numberOfGuests, advanceAmount (or pay full).
   - Server: create Guest (or find by phone if you allow “returning guest”), create Booking (e.g. CONFIRMED), create bill, generate booking reference.
   - Return: `bookingId`, `bookingReference` (e.g. 6–8 char code), guest name, dates, room, amount paid, “what’s next” message.

3. **Public “view my booking” by reference**
   - New route, e.g. `GET /api/public/bookings/[reference]` or `?reference=ABC123&phone=...`.
   - No auth: allow access only if client sends **booking reference + phone** (and optionally email) so only the guest can see it.
   - Return: booking details (dates, room, status, total, paid, balance, policies).

4. **Customer-facing pages (same app)**
   - `/book` — landing: dates, number of guests → “Check availability”.
   - `/book/rooms` — show available rooms for selected dates; select room → “Continue”.
   - `/book/checkout` — guest form (name, phone, email), advance/full payment, terms → “Confirm booking”.
   - `/book/confirmation` — show booking reference, summary, and link to “View my booking”.
   - `/my-booking` — form: “Booking reference + phone” → then show booking (read-only or with cancel/request change).

5. **Booking reference**
   - Store a short, unique `bookingReference` (e.g. in `Booking` table or use last part of existing `id`) and show it to the guest so they can use it on “View my booking”.

### Phase 2: Customer “My booking” actions (optional)

- **Cancel:** `POST /api/public/bookings/[reference]/cancel` with phone (and maybe OTP) → set status CANCELLED if within policy (e.g. 24h before check-in).
- **Pay balance:** Link to payment gateway or “pay at hotel”; if you add online payment, same public API can accept “pay balance” with reference + phone.
- **Request change:** e.g. “Request date change” → creates a request; staff handles in admin app.

### Phase 3: Optional “Guest login” (later)

- If you want “My bookings” list and saved profile:
  - **Guest login:** e.g. phone + OTP or magic link; issue a **guest JWT** (short-lived) or session.
  - **APIs:** e.g. `GET /api/guest/bookings` (requires guest token) so they see all bookings for that phone/user.
  - You can still keep **reference + phone** for one-off “view booking” without login.

---

## 4. Data / Backend Changes (minimal)

- **Booking:** add `bookingReference` (unique, URL-friendly) if you don’t already have one; or derive from existing `id`/`bookingId` for display.
- **Guest:** email optional but useful for confirmations and “view my booking” verification.
- **Public APIs:** new routes under `/api/public/...`; no `requireAuth()`; validate reference + phone (and optionally email) for “view/cancel” so only the customer can access their booking.

---

## 5. Security and Rules

- **Availability:** read-only; no PII. Optional rate limit.
- **Create booking:** validate dates, room availability, and amounts; prevent overbooking (use same logic as current booking creation).
- **View / cancel / pay:** always require **booking reference + phone** (and optionally email) so only the guest can access that booking.
- **Optional:** CAPTCHA on “create booking” and “view my booking” to reduce bots and abuse.

---

## 6. Order of Implementation (summary)

1. Add **booking reference** (field or derived) and return it when booking is created (staff or public).
2. Add **public availability** API and **public create booking** API; keep staff booking creation as is.
3. Add **public “view booking”** API (reference + phone).
4. Build customer pages: **/book** (flow) and **/my-booking** (view by reference + phone).
5. Optionally add **cancel** and **pay balance** via public APIs and same customer pages.
6. Later: guest login + “My bookings” list if needed.

This plan reuses your existing booking and guest model and only adds public APIs and customer-facing routes so customers can book online and access their booking according to the rules above.
