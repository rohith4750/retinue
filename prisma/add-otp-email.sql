-- OTP via email until Fast2SMS DLT is approved: add email, make phone optional.
-- Run in SQL editor or: psql $DATABASE_URL -f prisma/add-otp-email.sql

ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "OtpVerification" ALTER COLUMN "phone" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "OtpVerification_email_purpose_idx" ON "OtpVerification"("email", "purpose") WHERE "email" IS NOT NULL;
