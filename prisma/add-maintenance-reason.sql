-- Add maintenanceReason to Room for tracking repair type (Electronics, AC, Fans, Carpenter, etc.)
-- Run with: psql $DATABASE_URL -f prisma/add-maintenance-reason.sql
-- Or run the single statement in your DB client.

ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "maintenanceReason" TEXT;
