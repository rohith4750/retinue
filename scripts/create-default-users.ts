/**
 * Script to create default users for all roles
 * Run with: npx tsx scripts/create-default-users.ts
 * Or: npx ts-node scripts/create-default-users.ts
 */

import { PrismaClient, UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const defaultUsers = [
  {
    username: 'superadmin',
    password: 'superadmin123',
    role: UserRole.SUPER_ADMIN,
  },
  {
    username: 'admin',
    password: 'admin123',
    role: UserRole.ADMIN,
  },
  {
    username: 'receptionist',
    password: 'receptionist123',
    role: UserRole.RECEPTIONIST,
  },
  {
    username: 'staff',
    password: 'staff123',
    role: UserRole.STAFF,
  },
]

async function createDefaultUsers() {
  console.log('🚀 Creating default users for all roles...\n')

  const createdUsers = []
  const skippedUsers = []

  for (const userData of defaultUsers) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { username: userData.username },
      })

      if (existing) {
        console.log(`⏭️  Skipped: ${userData.username} (${userData.role}) - already exists`)
        skippedUsers.push(userData.username)
        continue
      }

      // Hash password
      const hashedPassword = await hash(userData.password, 12)

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          password: hashedPassword,
          role: userData.role,
        },
      })

      console.log(`✅ Created: ${user.username} (${user.role}) - Password: ${userData.password}`)
      createdUsers.push(user.username)
    } catch (error: any) {
      console.error(`❌ Error creating ${userData.username}:`, error.message)
      skippedUsers.push(userData.username)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Created: ${createdUsers.length} user(s)`)
  console.log(`   Skipped: ${skippedUsers.length} user(s)`)
  console.log(`   Total: ${defaultUsers.length} user(s)\n`)

  if (createdUsers.length > 0) {
    console.log('✅ Created users:')
    createdUsers.forEach((username) => {
      const userData = defaultUsers.find((u) => u.username === username)
      console.log(`   - ${username} (${userData?.role})`)
    })
  }

  if (skippedUsers.length > 0) {
    console.log('\n⏭️  Skipped users:')
    skippedUsers.forEach((username) => {
      console.log(`   - ${username}`)
    })
  }

  console.log('\n📝 Default Credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  defaultUsers.forEach((user) => {
    console.log(`   ${user.role.padEnd(15)} | Username: ${user.username.padEnd(15)} | Password: ${user.password}`)
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

createDefaultUsers()
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
