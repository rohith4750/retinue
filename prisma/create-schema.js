// Alternative: Create schema using raw SQL
// Run with: node prisma/create-schema.js

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSchema() {
  console.log('🔄 Creating database schema...')
  
  try {
    // Create enums first
    const enumSQL = `
      CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE', 'DELUXE', 'SUITE');
      CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');
      CREATE TYPE "SlotType" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT', 'FULL_DAY');
      CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');
      CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');
      CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST', 'STAFF');
      CREATE TYPE "InventoryTransactionType" AS ENUM ('IN', 'OUT');
      CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE');
    `
    
    // Execute enum creation (one at a time)
    const enumStatements = enumSQL.split(';').filter(s => s.trim())
    for (const stmt of enumStatements) {
      if (stmt.trim()) {
        try {
          await prisma.$executeRawUnsafe(stmt.trim() + ';')
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.log(`   ⚠ ${err.message}`)
          }
        }
      }
    }
    
    console.log('   ✓ Created enums')
    
    // Note: Creating tables manually is complex due to foreign keys
    // It's better to use Prisma db push, but if that fails due to permissions,
    // you can use Prisma Studio or a GUI tool
    
    console.log('✅ Schema setup initiated!')
    console.log('📝 Note: Full schema creation requires Prisma db push')
    console.log('   If db:push fails, try:')
    console.log('   1. Run terminal as Administrator')
    console.log('   2. Or use pgAdmin to run the SQL from prisma/reset-database.sql')
    console.log('   3. Then run: npm run db:push -- --skip-generate')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createSchema()
