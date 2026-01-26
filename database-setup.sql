-- ============================================
-- Database Setup Script for Hotel Management
-- Run this in your Supabase/Neon SQL Editor
-- ============================================

-- Step 1: Create Enums (if they don't exist)
DO $$ BEGIN
    CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE', 'DELUXE', 'SUITE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SlotType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InventoryTransactionType" AS ENUM ('IN', 'OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create User Table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Step 3: Create Admin User
-- Password: admin123 (hashed with bcrypt, 12 rounds)
-- You can generate a new hash at: https://bcrypt-generator.com/
-- Or use: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 12).then(console.log)"

INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES (
    'admin001',
    'admin',
    'admin@hotel.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Q5K2', -- admin123
    'ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username") DO NOTHING;

-- Step 4: Create Super Admin User
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES (
    'superadmin001',
    'superadmin',
    'superadmin@hotel.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Q5K2', -- admin123 (same password for demo)
    'SUPER_ADMIN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username") DO NOTHING;

-- Step 5: Create Receptionist User
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES (
    'receptionist001',
    'receptionist',
    'receptionist@hotel.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Q5K2', -- admin123
    'RECEPTIONIST',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username") DO NOTHING;

-- Step 6: Create Staff User
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES (
    'staff001',
    'staff',
    'staff@hotel.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Q5K2', -- admin123
    'STAFF',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username") DO NOTHING;

-- Verify users were created
SELECT "id", "username", "email", "role", "createdAt" FROM "User";
