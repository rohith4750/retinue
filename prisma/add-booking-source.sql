 -- Add source to Booking: STAFF = management site (hoteltheretinue.in), ONLINE = public site (hoteltheretinueonline.in)
-- Run with your DB client or: psql $DATABASE_URL -f prisma/add-booking-source.sql

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- Existing bookings = from management site
UPDATE "Booking" SET "source" = 'STAFF' WHERE "source" IS NULL;

-- Optional: default for new rows (if your DB supports it)
-- ALTER TABLE "Booking" ALTER COLUMN "source" SET DEFAULT 'STAFF';

-- Index for filtering online bookings
CREATE INDEX IF NOT EXISTS "Booking_source_idx" ON "Booking"("source");
