import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default admin user
  const hashedPassword = await hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  })

  console.log('✅ Created admin user:', admin.username)
  console.log('   Username: admin')
  console.log('   Password: admin123')
  console.log('   Role: SUPER_ADMIN')

  // Create sample rooms
  const rooms = [
    {
      roomNumber: '101',
      roomType: 'SINGLE' as const,
      floor: 1,
      basePrice: 1500,
      capacity: 2,
      status: 'AVAILABLE' as const,
    },
    {
      roomNumber: '102',
      roomType: 'DOUBLE' as const,
      floor: 1,
      basePrice: 2500,
      capacity: 4,
      status: 'AVAILABLE' as const,
    },
    {
      roomNumber: '201',
      roomType: 'DELUXE' as const,
      floor: 2,
      basePrice: 3500,
      capacity: 4,
      status: 'AVAILABLE' as const,
    },
    {
      roomNumber: '301',
      roomType: 'SUITE' as const,
      floor: 3,
      basePrice: 5000,
      capacity: 6,
      status: 'AVAILABLE' as const,
    },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
      create: room,
    })
  }

  console.log('✅ Created sample rooms')

  // Create sample inventory items
  const inventoryItems = [
    {
      itemName: 'Bedsheets',
      category: 'Linen',
      quantity: 50,
      unit: 'pieces',
      minStock: 20,
    },
    {
      itemName: 'Pillows',
      category: 'Linen',
      quantity: 30,
      unit: 'pieces',
      minStock: 15,
    },
    {
      itemName: 'Toilet Paper',
      category: 'Toiletries',
      quantity: 100,
      unit: 'rolls',
      minStock: 50,
    },
    {
      itemName: 'Towels',
      category: 'Linen',
      quantity: 40,
      unit: 'pieces',
      minStock: 20,
    },
  ]

  for (const item of inventoryItems) {
    const existing = await prisma.inventory.findFirst({
      where: {
        itemName: item.itemName,
        category: item.category,
      },
    })

    if (!existing) {
      await prisma.inventory.create({
        data: item,
      })
    }
  }

  console.log('✅ Created sample inventory items')

  // Create sample staff
  const staffMembers = [
    {
      name: 'John Doe',
      role: 'Receptionist',
      phone: '9876543210',
      salary: 25000,
      status: 'ACTIVE',
    },
    {
      name: 'Jane Smith',
      role: 'Manager',
      phone: '9876543211',
      salary: 50000,
      status: 'ACTIVE',
    },
    {
      name: 'Bob Johnson',
      role: 'Housekeeping',
      phone: '9876543212',
      salary: 20000,
      status: 'ACTIVE',
    },
  ]

  for (const staff of staffMembers) {
    await prisma.staff.create({
      data: staff,
    })
  }

  console.log('✅ Created sample staff members')

  console.log('\n🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
