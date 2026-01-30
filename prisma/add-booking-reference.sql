-- Add bookingReference to Booking: short unique code for "view my booking" (public site).
-- Run with your DB client or: psql $DATABASE_URL -f prisma/add-booking-reference.sql

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingReference" TEXT;

-- Unique constraint for lookups (create unique index; Prisma uses @unique)
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingReference_key" ON "Booking"("bookingReference") WHERE "bookingReference" IS NOT NULL;
