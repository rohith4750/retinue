-- ============================================
-- Quick User Creation Query
-- Run this in Supabase SQL Editor to create a single user
-- ============================================

-- Create a new admin user
-- Replace the values as needed:
-- - username: your desired username
-- - email: your email (or NULL)
-- - password_hash: generate at https://bcrypt-generator.com/ (use 12 rounds)
-- - role: SUPER_ADMIN, ADMIN, RECEPTIONIST, or STAFF

INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,  -- Auto-generate ID
    'your_username',          -- Change this
    'your_email@example.com', -- Change this (or use NULL)
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZ5Q5K2', -- Change this: generate hash for your password
    'ADMIN',                  -- Change this: SUPER_ADMIN, ADMIN, RECEPTIONIST, or STAFF
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username") DO UPDATE
SET "email" = EXCLUDED."email",
    "role" = EXCLUDED."role",
    "updatedAt" = CURRENT_TIMESTAMP;

-- To generate password hash, use one of these methods:
-- 1. Online: https://bcrypt-generator.com/ (use 12 rounds)
-- 2. Node.js: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 12).then(console.log)"
-- 3. Use your API endpoint: POST /api/auth/create-users (creates default users)

-- Example: Create user with password "mypassword123"
-- First generate hash, then replace the password field above
