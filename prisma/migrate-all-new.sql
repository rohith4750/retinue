-- =============================================================================
-- All new migrations (run in SQL editor or: psql $DATABASE_URL -f prisma/migrate-all-new.sql)
-- Safe to run: uses IF NOT EXISTS / WHERE ... IS NULL so already-applied parts skip.
-- =============================================================================

-- 1. Room: maintenance reason when status = MAINTENANCE
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "maintenanceReason" TEXT;

-- 2. Booking: source (STAFF = management site, ONLINE = public site)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "source" TEXT;
UPDATE "Booking" SET "source" = 'STAFF' WHERE "source" IS NULL;
CREATE INDEX IF NOT EXISTS "Booking_source_idx" ON "Booking"("source");

-- 3. Booking: short reference for "view my booking" (public site)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingReference" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingReference_key" ON "Booking"("bookingReference") WHERE "bookingReference" IS NOT NULL;

-- 4. OTP verification (Fast2SMS sign-up)
CREATE TABLE IF NOT EXISTS "OtpVerification" (
  "id"        TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "code"      TEXT NOT NULL,
  "purpose"   TEXT NOT NULL DEFAULT 'SIGNUP',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OtpVerification_phone_purpose_idx" ON "OtpVerification"("phone", "purpose");
CREATE INDEX IF NOT EXISTS "OtpVerification_expiresAt_idx" ON "OtpVerification"("expiresAt");

-- 5. Customer (public-site sign-up, OTP-verified)
CREATE TABLE IF NOT EXISTS "Customer" (
  "id"        TEXT NOT NULL,
  "phone"     TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "email"     TEXT,
  "address"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_phone_key" UNIQUE ("phone")
);
CREATE INDEX IF NOT EXISTS "Customer_phone_idx" ON "Customer"("phone");
