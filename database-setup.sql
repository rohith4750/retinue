-- ============================================
-- Database Setup Script for The Retinue
-- Run this in your Neon/Supabase SQL Editor
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Step 3: Create Room Table
CREATE TABLE IF NOT EXISTS "Room" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomType" "RoomType" NOT NULL,
    "floor" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Room_roomNumber_key" ON "Room"("roomNumber");

-- Step 4: Create RoomSlot Table
CREATE TABLE IF NOT EXISTS "RoomSlot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotType" "SlotType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomSlot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoomSlot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 5: Create Guest Table
CREATE TABLE IF NOT EXISTS "Guest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "idProof" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create Booking Table
CREATE TABLE IF NOT EXISTS "Booking" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "RoomSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Booking_roomId_status_idx" ON "Booking"("roomId", "status");
CREATE INDEX IF NOT EXISTS "Booking_guestId_idx" ON "Booking"("guestId");
CREATE INDEX IF NOT EXISTS "Booking_checkIn_checkOut_idx" ON "Booking"("checkIn", "checkOut");
CREATE INDEX IF NOT EXISTS "Booking_status_checkIn_idx" ON "Booking"("status", "checkIn");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");

-- Step 7: Create Bill Table
CREATE TABLE IF NOT EXISTS "Bill" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Bill_bookingId_key" UNIQUE ("bookingId"),
    CONSTRAINT "Bill_billNumber_key" UNIQUE ("billNumber"),
    CONSTRAINT "Bill_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 8: Create Inventory Table
CREATE TABLE IF NOT EXISTS "Inventory" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "minStock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- Step 9: Create InventoryTransaction Table
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryTransaction_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 10: Create Staff Table
CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "salary" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- Step 11: Create Attendance Table
CREATE TABLE IF NOT EXISTS "Attendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 12: Create BookingHistory Table
CREATE TABLE IF NOT EXISTS "BookingHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changedBy" TEXT,
    "changes" JSONB,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookingHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BookingHistory_bookingId_idx" ON "BookingHistory"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingHistory_timestamp_idx" ON "BookingHistory"("timestamp");

-- Step 13: Create Default Users
-- Password: admin123 (hashed with bcryptjs, 12 rounds)
-- Note: After running this script, it's better to use the API endpoint to create users
-- which will generate the correct hash: POST /api/auth/create-users

-- Option 1: Use API endpoint (RECOMMENDED - generates correct hash)
-- After tables are created, call: POST https://retinue.vercel.app/api/auth/create-users

-- Option 2: Insert users with pre-generated hash (if API doesn't work)
-- Hash for "admin123": $2a$12$sad7VDpdzJJMm.RmfC.Pv.Gt/NJnhEup6vP.b12KPnadg1WuWh5T.
INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES 
    (
        'admin001',
        'admin',
        'admin@hotel.com',
        '$2a$12$sad7VDpdzJJMm.RmfC.Pv.Gt/NJnhEup6vP.b12KPnadg1WuWh5T.', -- admin123 (fresh hash)
        'ADMIN',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'superadmin001',
        'superadmin',
        'superadmin@hotel.com',
        '$2a$12$sad7VDpdzJJMm.RmfC.Pv.Gt/NJnhEup6vP.b12KPnadg1WuWh5T.', -- admin123
        'SUPER_ADMIN',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'receptionist001',
        'receptionist',
        'receptionist@hotel.com',
        '$2a$12$sad7VDpdzJJMm.RmfC.Pv.Gt/NJnhEup6vP.b12KPnadg1WuWh5T.', -- admin123
        'RECEPTIONIST',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'staff001',
        'staff',
        'staff@hotel.com',
        '$2a$12$sad7VDpdzJJMm.RmfC.Pv.Gt/NJnhEup6vP.b12KPnadg1WuWh5T.', -- admin123
        'STAFF',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("username") DO UPDATE
SET "password" = EXCLUDED."password",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Step 14: Verify Setup
SELECT 'Database setup completed!' as status;
SELECT COUNT(*) as user_count FROM "User";
SELECT COUNT(*) as enum_count FROM pg_type WHERE typname IN ('RoomType', 'RoomStatus', 'SlotType', 'BookingStatus', 'PaymentStatus', 'UserRole', 'InventoryTransactionType', 'AttendanceStatus');
