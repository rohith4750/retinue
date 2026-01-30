# Management Repo – Implementation Checklist

This is the **management site** (hoteltheretinue.in). Below: what is implemented vs what is still missing, and what you need to run (e.g. DB migrations).

---

## Implemented

| Feature | Where | Notes |
|--------|--------|------|
| **Booking source (STAFF / ONLINE)** | Schema, API, UI | Bookings have `source`; staff create = STAFF; filter `?source=online` in GET /api/bookings |
| **Online Bookings menu** | Sidebar | Link: `/bookings?source=online`; active state when `?source=online` |
| **Bookings page source filter** | `app/bookings/page.tsx` | Reads `?source=online`, calls API with `source=online`, shows “Online Bookings” badge |
| **Room maintenance reason** | Schema, API, Rooms page | `Room.maintenanceReason`; form presets (Electronics, AC, Fans, Carpenter, etc.); shown on cards/chips when MAINTENANCE |
| **Rooms availability (time-based)** | `app/api/rooms/available/route.ts` | Overlap by full datetime; no date-only filter; returns `checkInAt` / `checkOutAt` for booked rooms |
| **Asset locator – all rooms + status** | `app/assets/assign/page.tsx` | Fetches all rooms (no status filter); dropdown shows room + status (AVAILABLE, BOOKED, MAINTENANCE) |
| **Bills list redesign** | `app/bills/page.tsx` | Search, status filter (All / Pending / Partial / Paid), card + table view, summary strip |
| **Stock & Assets rename** | Sidebar, Toolbar, inventory/assign/assets pages | “Inventory” → “Stock & Assets” in UI only |
| **Dark mode only** | ThemeProvider, Toolbar, globals.css | Light mode removed; no theme toggle |
| **Booking analytics (guest + room type)** | Dashboard API + page | By guest type and by room type; revenue = totalAmount |
| **CORS for public API** | `middleware.ts` | For `/api/public/*` when `ALLOWED_ORIGINS` is set |
| **Online site API integration doc** | `ONLINE_SITE_API_INTEGRATION.md` | Base URL, endpoints contract, CORS env |
| **Customer portal plan** | `CUSTOMER_BOOKING_PORTAL_PLAN.md` | Plan for public booking flow and “view my booking” |

---

## Not Implemented (to do)

| Item | Purpose | Where to add |
|------|--------|---------------|
| **Public API: availability** | Online site checks rooms for dates | `app/api/public/rooms/available/route.ts` – same logic as `app/api/rooms/available/route.ts` but **no** `requireAuth()` |
| **Public API: create booking** | Online site creates booking | `app/api/public/bookings/route.ts` – validate input, create Guest + Booking + bill, set `source: 'ONLINE'`, return bookingId + **bookingReference** |
| **Public API: view booking by reference** | “View my booking” on online site | `app/api/public/bookings/by-reference/route.ts` – GET with `?reference=...&phone=...`, verify phone, return booking (no auth) |
| **Booking reference field** | Short code for “view my booking” | Add `bookingReference` (unique) to `Booking` in Prisma, or derive from `id` (e.g. last 8 chars); generate on create and return in public create-booking response |

Until these public routes and (if you want) `bookingReference` exist, the **online site (hoteltheretinueonline.in)** cannot create or view bookings via API; it can only use the doc as a contract.

---

## Database migrations (you must run)

These columns were added in schema; run the SQL or migrations so the DB matches.

| Migration | File | Action |
|-----------|------|--------|
| **Room.maintenanceReason** | `prisma/add-maintenance-reason.sql` | Run: `ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "maintenanceReason" TEXT;` (or use `npx prisma migrate dev`) |
| **Booking.source** | `prisma/add-booking-source.sql` | Run the script (adds `source`, backfills STAFF, index). Then `npx prisma generate` |

After editing schema, always run:

```bash
npx prisma generate
```

If you use Prisma Migrate:

```bash
npx prisma migrate dev --name add_maintenance_reason
npx prisma migrate dev --name add_booking_source
```

---

## Env (management site – hoteltheretinue.in)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Prisma / DB connection |
| `DIRECT_URL` | Yes (Neon) | For migrations |
| `JWT_SECRET` | Yes | Access token |
| `JWT_REFRESH_SECRET` | Yes | Refresh token |
| `ALLOWED_ORIGINS` | For online site | CORS for `/api/public/*`. Example: `https://hoteltheretinueonline.in,https://www.hoteltheretinueonline.in` |

---

## Summary

- **Management UI and staff flows:** Booking source, Online Bookings menu, maintenance reason, bills, dark-only, analytics, asset locator, CORS and integration doc are implemented.
- **Public APIs for online site:** Not implemented yet – need `app/api/public/rooms/available`, `app/api/public/bookings` (POST), and `app/api/public/bookings/by-reference` (GET), plus optional `bookingReference` on Booking.
- **DB:** Run the two SQL migrations (or Prisma migrations) and `prisma generate` so `Room.maintenanceReason` and `Booking.source` exist.
