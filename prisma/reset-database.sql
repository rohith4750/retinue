-- SQL Script to Reset Database Schema
-- Run this in your PostgreSQL client (pgAdmin, psql, etc.)
-- WARNING: This will delete all data!

-- Drop all tables (in correct order to handle foreign keys)
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "Staff" CASCADE;
DROP TABLE IF EXISTS "InventoryTransaction" CASCADE;
DROP TABLE IF EXISTS "Inventory" CASCADE;
DROP TABLE IF EXISTS "Bill" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Guest" CASCADE;
DROP TABLE IF EXISTS "RoomSlot" CASCADE;
DROP TABLE IF EXISTS "Room" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS "AttendanceStatus" CASCADE;
DROP TYPE IF EXISTS "InventoryTransactionType" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "BookingStatus" CASCADE;
DROP TYPE IF EXISTS "SlotType" CASCADE;
DROP TYPE IF EXISTS "RoomStatus" CASCADE;
DROP TYPE IF EXISTS "RoomType" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- Now run: npm run db:push
-- Then run: npm run db:seed
