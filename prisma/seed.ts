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
    { roomNumber: 'Suite-1', roomType: 'SUITE' as const, floor: 1, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-2', roomType: 'SUITE' as const, floor: 1, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-3', roomType: 'SUITE' as const, floor: 1, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-4', roomType: 'SUITE' as const, floor: 1, basePrice: 3500, capacity: 4, status: 'AVAILABLE' as const },
    // Suite+ (2) – ₹4000/day
    { roomNumber: 'Suite-+1', roomType: 'SUITE_PLUS' as const, floor: 1, basePrice: 4000, capacity: 4, status: 'AVAILABLE' as const },
    { roomNumber: 'Suite-+2', roomType: 'SUITE_PLUS' as const, floor: 1, basePrice: 4000, capacity: 4, status: 'AVAILABLE' as const },
  ]

  for (const room of rooms) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: { roomType: room.roomType as import('@prisma/client').RoomType, floor: room.floor, basePrice: room.basePrice, capacity: room.capacity },
      create: room as import('@prisma/client').Prisma.RoomCreateInput,
    })
  }

  console.log('✅ Created rooms (4 Standard, 4 Suites, 2 Suite+)')

  // 3. Create Slots for the next 7 days for all rooms
  console.log('📅 Creating room slots for the next 7 days...')
  const allRooms = await prisma.room.findMany()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const room of allRooms) {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      await prisma.roomSlot.upsert({
        where: {
          roomId_date_slotType: {
            roomId: room.id,
            date: date,
            slotType: 'FULL_DAY',
          },
        },
        update: {},
        create: {
          roomId: room.id,
          date: date,
          slotType: 'FULL_DAY',
          price: room.basePrice,
          isAvailable: true,
        },
      })
    }
  }

  // 4. Create Sample Guests
  const guestsData = [
    { name: 'Rahul Sharma', phone: '9876543210', address: '123 MG Road, Bangalore', idProof: '1234 5678 9012' },
    { name: 'Priya Patel', phone: '9123456789', address: '456 Ring Road, Ahmedabad', idProof: '5678 1234 9012' },
    { name: 'Anil Kumar', phone: '9988776655', address: '789 Jubilee Hills, Hyderabad', idProof: '9012 5678 1234' },
    { name: 'Megha Gupta', phone: '8877665544', address: '101 Civil Lines, Delhi', idProof: '3456 7890 1234' },
  ]

  const guests = []
  for (const g of guestsData) {
    const guest = await prisma.guest.create({ data: g })
    guests.push(guest)
  }
  console.log('✅ Created 4 sample guests')

  // 5. Create Sample Bookings (Some pending, some paid, some checked out)
  console.log('🛎️ Creating sample bookings...')
  
  // Pending Bill (Checked Out with balance) - Rahul Sharma
  const room101 = await prisma.room.findUnique({ where: { roomNumber: '101' } })
  const slot101 = await prisma.roomSlot.findFirst({ where: { roomId: room101?.id } })
  
  if (room101 && slot101) {
    const checkIn = new Date(today); checkIn.setDate(today.getDate() - 3)
    const checkOut = new Date(today); checkOut.setDate(today.getDate() - 1)
    
    await prisma.booking.create({
      data: {
        roomId: room101.id,
        slotId: slot101.id,
        guestId: guests[0].id,
        checkIn,
        checkOut,
        totalAmount: 5000,
        advanceAmount: 1000,
        balanceAmount: 4000,
        paidAmount: 1000,
        paymentStatus: 'PARTIAL',
        status: 'CHECKED_OUT',
        bookingReference: 'PENDING001',
        billNumber: 'BILL-2026-001',
        subtotal: 5000,
      }
    })
  }

  // Pending Bill (Checked Out with balance) - Megha Gupta
  const roomSuite1 = await prisma.room.findUnique({ where: { roomNumber: 'Suite-1' } })
  const slotSuite1 = await prisma.roomSlot.findFirst({ where: { roomId: roomSuite1?.id } })

  if (roomSuite1 && slotSuite1) {
    const checkIn = new Date(today); checkIn.setDate(today.getDate() - 4)
    const checkOut = new Date(today); checkOut.setDate(today.getDate() - 2)

    await prisma.booking.create({
      data: {
        roomId: roomSuite1.id,
        slotId: slotSuite1.id,
        guestId: guests[3].id,
        checkIn,
        checkOut,
        totalAmount: 14000,
        advanceAmount: 4000,
        balanceAmount: 10000,
        paidAmount: 4000,
        paymentStatus: 'PARTIAL',
        status: 'CHECKED_OUT',
        bookingReference: 'PENDING002',
        billNumber: 'BILL-2026-002',
        subtotal: 14000,
      }
    })
  }

  // Active Booking (Checked In) - Priya Patel
  const room102 = await prisma.room.findUnique({ where: { roomNumber: '102' } })
  const slot102 = await prisma.roomSlot.findFirst({ where: { roomId: room102?.id } })
  if (room102 && slot102) {
    await prisma.booking.create({
      data: {
        roomId: room102.id,
        slotId: slot102.id,
        guestId: guests[1].id,
        checkIn: today,
        checkOut: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        totalAmount: 5000,
        advanceAmount: 2000,
        balanceAmount: 3000,
        paidAmount: 2000,
        paymentStatus: 'PARTIAL',
        status: 'CHECKED_IN',
        bookingReference: 'ACTIVE001',
      }
    })
  }

  console.log('✅ Created sample bookings (including 2 pending bills for the alert system)')
  console.log('\n🎉 Seeding completed! All systems ready.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
