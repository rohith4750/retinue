// Node.js script to reset database
// Run with: node prisma/reset-db.js

const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🔄 Resetting database...')
  
  try {
    // Drop all tables (one at a time to avoid prepared statement issues)
    const tables = [
      'Attendance',
      'Staff',
      'InventoryTransaction',
      'Inventory',
      'Bill',
      'Booking',
      'Guest',
      'RoomSlot',
      'Room',
      'User'
    ]
    
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE;`)
        console.log(`   ✓ Dropped table: ${table}`)
      } catch (err) {
        // Table might not exist, that's okay
        if (!err.message.includes('does not exist')) {
          console.log(`   ⚠ Could not drop table ${table}: ${err.message}`)
        }
      }
    }
    
    // Drop all enums (one at a time)
    const enums = [
      'AttendanceStatus',
      'InventoryTransactionType',
      'PaymentStatus',
      'BookingStatus',
      'SlotType',
      'RoomStatus',
      'RoomType',
      'UserRole'
    ]
    
    for (const enumType of enums) {
      try {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumType}" CASCADE;`)
        console.log(`   ✓ Dropped enum: ${enumType}`)
      } catch (err) {
        // Enum might not exist, that's okay
        if (!err.message.includes('does not exist')) {
          console.log(`   ⚠ Could not drop enum ${enumType}: ${err.message}`)
        }
      }
    }
    
    console.log('✅ Database reset complete!')
    console.log('📝 Next steps:')
    console.log('   1. Run: npm run db:push')
    console.log('   2. Run: npm run db:seed')
    
  } catch (error) {
    console.error('❌ Error resetting database:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetDatabase()
