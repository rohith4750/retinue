# Hotel Management – Testing & Business Logic Report

**Perspective:** Hotel Manager / Receptionist  
**Scope:** All main flows, FE + BE, business logic and improvements.

---

## 1. Fixes Applied (Backend & Shared)

### 1.1 GET /api/bookings – Search by booking ID
- **Issue:** Search used `bookingId` in the `where` clause, but the Prisma `Booking` model has `id` (not `bookingId`). Booking IDs (e.g. RETINU0123) are stored in `id`.
- **Fix:** Search now uses `id` and `billNumber` so receptionist can find by booking ID or bill number.

### 1.2 Audit trail – User ID missing
- **Issue:** APIs used `(authResult as any).userId` for `changedBy` in booking/bill history, but `getSessionUser` only returned `{ id, role, username }`, so `userId` was undefined and audit had no user.
- **Fix:** `lib/api-helpers.ts` now returns `userId: user.id` so all audit entries get the correct user.

### 1.3 Dashboard – Low inventory query
- **Issue:** Low stock used `prisma.inventory.fields.minStock` in a `where` clause. That is not valid at runtime and would throw or return wrong data.
- **Fix:** Load all inventory and filter in memory: `quantity <= minStock`.

### 1.4 PUT /api/bookings/[id] – Room change
- **Issue:** When changing room we only updated `roomId`. Old slot and old room were not freed; booking kept pointing to the old room’s slot (data inconsistency).
- **Fix:** On room change we now:
  - Check new room has no overlapping CONFIRMED/CHECKED_IN booking for the same dates.
  - Create a new slot for the new room (same date, FULL_DAY, new room’s base price).
  - Set booking’s `roomId` and `slotId` to the new room and new slot.
  - Free old slot (`isAvailable: true`).
  - Set old room to AVAILABLE if no other active booking uses it.

### 1.5 PUT /api/bills/[id] – Payment validation
- **Issue:** No check for CANCELLED booking; no validation that paid amount is non‑negative.
- **Fix:**
  - Reject with 400 if booking status is CANCELLED.
  - Validate `paidAmount` is a number and ≥ 0.

---

## 2. Flows Verified (Logic Only)

### 2.1 Booking lifecycle (state machine)
- **PENDING → CONFIRMED / CANCELLED**
- **CONFIRMED → CHECKED_IN / CANCELLED**
- **CHECKED_IN → CHECKED_OUT**
- **CHECKED_OUT / CANCELLED** are terminal.
- Implemented in `lib/booking-state-machine.ts` and used in PUT booking.

### 2.2 Create booking (POST /api/bookings)
- Auth: RECEPTIONIST (or higher).
- Validation: Zod schema, dates (today or future, check-out > check-in, max 30 days), room exists and not MAINTENANCE, no date conflict (CONFIRMED/CHECKED_IN).
- Guest: find by phone or create; update name/address/idProof if existing.
- Multi-room: supports `roomIds`; discount/advance distributed per room; one guest for all rooms.
- Room status: set to BOOKED only if check-in is today or in the past (future bookings leave room AVAILABLE until check-in).
- Audit: CREATED logged with user.

### 2.3 Update booking (PUT /api/bookings/[id])
- Status: only allowed transitions (state machine).
- CHECKED_OUT: slot freed, room set to AVAILABLE.
- CHECKED_IN: room set to BOOKED.
- Extend stay: extra days × room.basePrice; subtotal/tax/total/balance and payment status recalculated.
- Room change: only when status ≠ CHECKED_IN; conflict check on new room; new slot created; old slot/room freed as above.

### 2.4 Cancel booking (DELETE without ?permanent=true)
- RECEPTIONIST can cancel; CHECKED_OUT cannot be cancelled; slot and room freed; status CANCELLED; audit logged.

### 2.5 Rooms available (GET /api/rooms/available)
- Without dates: all non‑MAINTENANCE rooms.
- With checkIn/checkOut: excludes rooms with overlapping PENDING/CONFIRMED/CHECKED_IN bookings; date overlap: `checkIn < existing.checkOut && checkOut > existing.checkIn`.

### 2.6 Bills (GET/PUT /api/bills/[id])
- Resolve by booking `id` or `billNumber`.
- PUT: paidAmount is “amount to add”; new paid = old paid + paidAmount; balance and payment status updated; PAYMENT_RECEIVED in history.
- After fixes: CANCELLED rejected; paidAmount must be ≥ 0.

### 2.7 Dashboard (GET /api/dashboard)
- Counts: rooms (total, available, booked), today’s check-ins, month’s bookings, revenue (paidAmount/totalAmount), pending payments, low inventory (after fix), booking status breakdown, guest type analytics, function halls, etc.
- Today’s revenue uses `createdAt` (booking creation date); “today’s check-ins” uses `checkIn` in [today, tomorrow). Logic is consistent for manager/receptionist use.

---

## 3. Frontend alignment

- **Bookings list:** Uses `data` and `pagination` from API; search passed as `search` query param (now works with booking ID / bill number).
- **New booking:** Sends `roomIds`, dates, guest, advance, discount; API creates guest/slots and applies validations.
- **Payment modal:** Sends “amount to add” as `paidAmount`; API adds to existing paid – aligned.
- **Extend stay:** Sends `checkOut` + `action: 'EXTEND_STAY'`; backend recalculates total and balance – correct.

---

## 4. Optional / future improvements

1. **PENDING and room availability**  
   `checkDateConflicts` and rooms/available only consider CONFIRMED and CHECKED_IN. PENDING does not block the room. If you want PENDING to hold the room for a short time, include PENDING in conflict and availability logic (and add expiry for PENDING).

2. **Refunds**  
   Bills PUT allows only positive “amount to add”. To support refunds (e.g. overpayment or cancellation refund), allow negative amount and set `paymentStatus` to REFUNDED when appropriate, and optionally cap `paidAmount` at 0.

3. **Today’s revenue definition**  
   Dashboard “today’s revenue” uses `createdAt`. You could add a metric based on `checkIn` or `updatedAt` (e.g. “revenue from stays that checked in today”) if needed for reporting.

4. **Role hierarchy**  
   `requireAuth('RECEPTIONIST')` allows ADMIN and SUPER_ADMIN. Hierarchy in `api-helpers` is STAFF < RECEPTIONIST < ADMIN < SUPER_ADMIN – correct for manager/receptionist access.

5. **Booking list and CANCELLED**  
   Default GET bookings excludes CANCELLED. Cancelled bookings are still accessible via history or `?status=CANCELLED`. No change required unless you want a dedicated “Cancelled” tab.

---

## 5. Quick test checklist (manual)

- [ ] Login as receptionist (or admin).
- [ ] **Rooms:** Open Rooms; set maintenance on one; open Available Rooms with dates; confirm that room is excluded when dates are provided.
- [ ] **New booking:** Choose dates and room(s), fill guest (new phone and existing phone); submit; confirm booking appears with correct total/advance/balance.
- [ ] **Search:** In Bookings, search by booking ID (e.g. RETINU0123) and by guest name/phone; confirm results.
- [ ] **Check-in / Check-out:** Confirm → Check In → Check Out; confirm room goes BOOKED then AVAILABLE and slot freed.
- [ ] **Payment:** Open Bill for a booking; add payment (custom amount and “Pay Full Balance”); confirm paid/balance and history.
- [ ] **Cancel:** Cancel a CONFIRMED booking; confirm room/slot freed and status CANCELLED; try to add payment for that booking (should be rejected).
- [ ] **Room change:** Create CONFIRMED booking; change room before check-in; confirm new room/slot and old room/slot freed.
- [ ] **Extend stay:** Check in a booking; extend checkout by 1 day; confirm total and balance updated.
- [ ] **Dashboard:** Confirm totals, today’s check-ins, low inventory (if any), and that no errors appear.

---

## 6. Files touched in this pass

| File | Change |
|------|--------|
| `app/api/bookings/route.ts` | Search: use `id` and `billNumber` instead of `bookingId`. |
| `lib/api-helpers.ts` | Return `userId: user.id` for audit. |
| `app/api/dashboard/route.ts` | Low inventory: filter in memory (`quantity <= minStock`). |
| `app/api/bookings/[id]/route.ts` | Room change: conflict check, new slot, free old slot/room; use correct slot/room on CHECKED_OUT/CHECKED_IN when room was changed. |
| `app/api/bills/[id]/route.ts` | Reject payment if CANCELLED; validate paidAmount ≥ 0. |

All of the above are backward compatible and align with receptionist/hotel manager flows and business logic.
