-- Add password hash column for customer password login (nullable for OTP-only users)
-- Run this if you already have the Customer table and need to add password support.

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255) NULL;

-- Optional: index on email for fast login lookup (if not exists)
CREATE INDEX IF NOT EXISTS "Customer_email_idx" ON "Customer"("email");
