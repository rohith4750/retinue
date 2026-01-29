import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default users (login with email + password: admin123)
  const hashedPassword = await hash('admin123', 12)

  // Upsert by username so we update existing users instead of creating duplicates
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      email: 'sanjeev.srivarsha1994@gmail.com',
      password: hashedPassword,
    },
    create: {
      username: 'admin',
      email: 'sanjeev.srivarsha1994@gmail.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  })

  const receptionist = await prisma.user.upsert({
    where: { username: 'receptionist' },
    update: {
      email: 'receptionisthoteltheretinue@gmail.com',
      password: hashedPassword,
    },
    create: {
      username: 'receptionist',
      email: 'receptionisthoteltheretinue@gmail.com',
      password: hashedPassword,
      role: 'RECEPTIONIST',
    },
  })

  console.log('✅ Created users (login with email + password: admin123)')
  console.log('   Admin:        sanjeev.srivarsha1994@gmail.com (SUPER_ADMIN)')
  console.log('   Receptionist: receptionisthoteltheretinue@gmail.com (RECEPTIONIST)')

  // Hotel The Retinue – rooms (Standard ₹2500, Suites ₹3500, Suite+ ₹4000 per day)
  const rooms = [
    // Standard (4 rooms) – ₹2500/day
    { roomNumber: '101', roomType: 'STANDARD' as const, floor: 1, basePrice: 2500, capacity: 2, status: 'AVAILABLE' as const },
    { roomNumber: '102', roomType: 'STANDARD' as const, floor: 1, basePrice: 2500, capacity: 2, status: 'AVAILABLE' as const },
    { roomNumber: '103', roomType: 'STANDARD' as const, floor: 1, basePrice: 2500, capacity: 2, status: 'AVAILABLE' as const },
    { roomNumber: '104', roomType: 'STANDARD' as const, floor: 1, basePrice: 2500, capacity: 2, status: 'AVAILABLE' as const },
    // Suites (4) – ₹3500/day
    { roomNumber: 'Suite-1', roomType: 'SUITE' as const, floor: 2, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-2', roomType: 'SUITE' as const, floor: 2, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-3', roomType: 'SUITE' as const, floor: 2, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-4', roomType: 'SUITE' as const, floor: 2, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    // Suite+ (2) – ₹4000/day
    { roomNumber: 'Suite-+1', roomType: 'SUITE_PLUS' as const, floor: 2, basePrice: 4000, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-+2', roomType: 'SUITE_PLUS' as const, floor: 2, basePrice: 4000, capacity: 4, status: 'AVAILABLE' as const },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: { roomType: room.roomType as import('@prisma/client').RoomType, floor: room.floor, basePrice: room.basePrice, capacity: room.capacity },
      create: room as import('@prisma/client').Prisma.RoomCreateInput,
    })
  }

  console.log('✅ Created rooms (4 Standard, 4 Suites, 2 Suite+)')

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
