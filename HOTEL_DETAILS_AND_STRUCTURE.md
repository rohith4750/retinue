# Hotel The Retinue & Butchiraju Conventions – Details, Rooms & Structure

Use this for website content, marketing, or the online booking portal.

---

## 1. Hotel details (contact & location)

| Field | Value |
|-------|--------|
| **Brand** | Hotel The Retinue & Butchiraju Conventions |
| **Name** | Hotel The Retinue |
| **Email** | hoteltheretinue@gmail.com |
| **Phone** | 7675800901 |
| **Address** | 2P-1-8, Chelikani Ramarao veedhi, Ramachandrapuram 533255 |
| **Short address** | Main Rd, Ramachandrapuram, Andhra Pradesh |
| **Landmark** | Main Road, Ramachandrapuram, Rajgopal Centre, Near HP Petrol Bank, Near Reliance Trends, 2nd Floor, Hotel The Retinue |
| **State** | Andhra Pradesh (37) |

---

## 2. Room structure and types

### Room types (categories)

| Type | Description (typical) |
|------|------------------------|
| **SINGLE** | Single occupancy |
| **DOUBLE** | Double occupancy |
| **DELUXE** | Deluxe room |
| **STANDARD** | Standard room |
| **SUITE** | Suite |
| **SUITE_PLUS** | Premium suite |

### Seeded rooms (default setup)

Actual room list and prices come from your database (seed or admin). Typical seed:

| Category | Room numbers | Floor | Base price (₹/day) | Capacity |
|----------|--------------|--------|---------------------|----------|
| **Standard** | 101, 102, 103, 104 | 1 | ₹2,500 | 2 (adults + children) |
| **Suite** | Suite-1, Suite-2, Suite-3, Suite-4 | 2 | ₹3,500 | 4 |
| **Suite+** | Suite-+1, Suite-+2 | 2 | ₹4,000 | 4 |

- **Total:** 10 rooms (4 Standard, 4 Suite, 2 Suite+).
- **Capacity** = total guests (adults + children) per room.
- Room status: **AVAILABLE**, **BOOKED**, or **MAINTENANCE** (with optional reason).

---

## 3. Stay policy and pricing (what we provide)

### Stay rules

- **Minimum stay:** 12 hours  
- **Multi-day:** Allowed (no maximum).  
- **Check-in:** Today or future date  
- **Check-out:** Must be after check-in  
- **Pricing:** **Per full 24h day** at the room’s base price (days = ceil(stay hours ÷ 24), minimum 1 day).

### Pricing calculation (per room, per stay)

- **Base:** Room’s `basePrice` × **days** (days = max(1, ceil(stay hours ÷ 24))).  
- **Discount:** Allowed; max 50% of base.  
- **GST:** 18% on (base − discount).  
- **Total** = (base − discount) + GST.  
- **Early checkout:**  
  - Stay **&lt; 12 hours:** minimum charge = **50% of base** (+ GST if applicable).  
  - Stay **≥ 12 hours:** charged by full day(s): base × ceil(hours ÷ 24) (+ GST).

### What’s included in the rate

- Room for the stay period (minimum 12 hours; multi-day allowed).  
- Pricing is **per room per day**, not per person (subject to room capacity).  
- GST applied as per policy above.  
- Advance/balance and payment modes (Cash, Card, UPI, etc.) as per your front-end/backend.

*You can add line items like “AC, WiFi, toiletries” etc. in your website copy; the system does not enforce an amenities list per room type.*

---

## 4. Function hall (conventions / events)

- **Function halls** are separate from rooms: name, capacity, price per day/hour, amenities (e.g. AC, Projector, Stage), description, status.  
- **Bookings:** Event type (e.g. Wedding, Birthday, Conference), date, start/end time, expected guests, total/advance/balance, special requests, meter readings for electricity if used.  
- **Pricing:** Stored as `pricePerDay` and optional `pricePerHour` per hall.  
- Function hall booking is managed in the **management app** (not in the public room-booking API).

---

## 5. Summary table (rooms & costs)

| Item | Details |
|------|--------|
| **Room categories** | Single, Double, Deluxe, Standard, Suite, Suite+ |
| **Example tariff (from seed)** | Standard ₹2,500, Suite ₹3,500, Suite+ ₹4,000 per day |
| **Stay** | Min 12 hours; multi-day allowed; charge per full 24h day |
| **GST** | 18% on (base − discount) |
| **Max discount** | 50% of base |
| **Early checkout** | &lt; 12h: 50% base; ≥ 12h: by full day(s) |
| **Hotel contact** | 7675800901, hoteltheretinue@gmail.com |
| **Location** | Ramachandrapuram, Andhra Pradesh 533255 |

---

## 6. For website / marketing copy (suggested text)

**Short tagline (example)**  
“Hotel The Retinue – Comfortable stays in Ramachandrapuram. Standard rooms, Suites and Suite+ with flexible multi-day stays and transparent pricing.”

**What we offer (example)**  
- **Rooms:** Standard, Suite and Suite+ categories.  
- **Stay:** Minimum 12 hours; multi-day bookings allowed; charge per full 24h day.  
- **Pricing:** Per room per day, 18% GST; discounts up to 50% of base.  
- **Conventions:** Function hall(s) for events (contact hotel for booking).  
- **Contact:** Phone 7675800901, email hoteltheretinue@gmail.com, Main Rd, Ramachandrapuram, Andhra Pradesh 533255.

---

*Room list and exact prices are in your database; update this doc if you change the seed or add rooms/prices in the management app.*
