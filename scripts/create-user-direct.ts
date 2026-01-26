/**
 * Direct User Creation Script
 * 
 * This script creates a user directly in the database using bcrypt.
 * Run: npx tsx scripts/create-user-direct.ts
 * 
 * Note: This uses bcrypt directly, so Prisma client generation is not required.
 */

import { hash } from 'bcryptjs'
import { Client } from 'pg'

// Note: DATABASE_URL should be set as environment variable
// In PowerShell: $env:DATABASE_URL="your_connection_string"
// Or it will be read from process.env automatically

// User details - MODIFY THESE
const USERNAME = 'admin'
const PASSWORD = 'admin123'
const EMAIL = 'admin@hotel.com' // or null
const ROLE = 'ADMIN' // SUPER_ADMIN, ADMIN, RECEPTIONIST, or STAFF

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!')
  console.error('   Please set it in your .env file or environment variables.')
  process.exit(1)
}

async function createUser() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // Check if user already exists
    const checkResult = await client.query(
      'SELECT id, username, role FROM "User" WHERE username = $1',
      [USERNAME]
    )

    if (checkResult.rows.length > 0) {
      console.log(`❌ User "${USERNAME}" already exists!`)
      console.log(`   ID: ${checkResult.rows[0].id}`)
      console.log(`   Role: ${checkResult.rows[0].role}`)
      return
    }

    // Hash password
    console.log('🔐 Hashing password...')
    const hashedPassword = await hash(PASSWORD, 12)

    // Generate ID (simple UUID-like string)
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create user
    const result = await client.query(
      `INSERT INTO "User" ("id", "username", "email", "password", "role", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, username, email, role, "createdAt"`,
      [id, USERNAME, EMAIL || null, hashedPassword, ROLE]
    )

    const user = result.rows[0]

    console.log('\n✅ User created successfully!')
    console.log('📋 User Details:')
    console.log(`   ID: ${user.id}`)
    console.log(`   Username: ${user.username}`)
    console.log(`   Email: ${user.email || 'N/A'}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Created: ${user.createdAt}`)
    console.log('\n🔐 Login Credentials:')
    console.log(`   Username: ${USERNAME}`)
    console.log(`   Password: ${PASSWORD}`)
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message)
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.error('\n💡 Tip: Make sure you have run the database setup SQL script first!')
      console.error('   Run database-setup.sql in your Supabase SQL Editor')
    }
  } finally {
    await client.end()
  }
}

createUser()
