import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GUEST_TYPES = ['WALK_IN', 'CORPORATE', 'OTA', 'REGULAR', 'FAMILY', 'GOVERNMENT', 'AGENT']
const STATUSES = ['CHECKED_OUT', 'CHECKED_IN', 'CONFIRMED', 'CANCELLED']

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('Starting Analytics Database Seeding...')

  // Step 1: Ensure we have rooms
  let rooms = await prisma.room.findMany()
  if (rooms.length === 0) {
    console.log('No rooms found. Creating sample rooms...')
    for (let i = 101; i <= 110; i++) {
        await prisma.room.create({
            data: {
                roomNumber: i.toString(),
                roomType: i <= 105 ? 'STANDARD' : (i <= 108 ? 'SUITE' : 'SUITE_PLUS'),
                floor: 1,
                basePrice: i <= 105 ? 1500 : 3500,
                capacity: 2
            }
        })
    }
    rooms = await prisma.room.findMany()
  }

  // Step 2: Create a generic pool of guests
  let guests = await prisma.guest.findMany()
  if (guests.length < 20) {
    console.log('Creating mock guests...')
    for (let i = 0; i < 30; i++) {
        await prisma.guest.create({
            data: {
                name: `Demo Guest ${i}`,
                phone: `99999${10000 + i}`,
                guestType: GUEST_TYPES[getRandomInt(0, GUEST_TYPES.length - 1)]
            }
        })
    }
    guests = await prisma.guest.findMany()
  }

  const msPerDay = 24 * 60 * 60 * 1000
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  console.log('Generating 45 days of historical bookings...')
  // Step 3: Loop 45 days in the past
  let totalBookings = 0
  for (let i = 45; i >= 0; i--) {
      const targetDate = new Date(today.getTime() - i * msPerDay)
      
      // Decide how many bookings to make today (1 to 6)
      const dailyBookingsCount = getRandomInt(1, 6)
      
      for (let j = 0; j < dailyBookingsCount; j++) {
          const room = rooms[getRandomInt(0, rooms.length - 1)]
          const guest = guests[getRandomInt(0, guests.length - 1)]
          
          // Upsert a RoomSlot for this day
          const slotDateStr = targetDate.toISOString().split('T')[0] + 'T00:00:00.000Z'
          
          let slot = await prisma.roomSlot.findFirst({
              where: { roomId: room.id, date: targetDate, slotType: 'FULL_DAY' }
          })
          
          if (!slot) {
              slot = await prisma.roomSlot.create({
                  data: {
                      roomId: room.id,
                      date: targetDate,
                      slotType: 'FULL_DAY',
                      price: room.basePrice,
                      isAvailable: false
                  }
              })
          }

          // Check if slot was already used for a booking to avoid unique constraints if any
          // (Booking doesn't have unique constraint on Slot, but realistically one slot = 1 booking)
          
          // Next Day Checkout
          const checkOutDate = new Date(targetDate.getTime() + 1 * msPerDay)

          let status = 'CHECKED_OUT'
          if (i === 0) status = ['CHECKED_IN', 'CONFIRMED'][getRandomInt(0, 1)]

          // Create Booking
          await prisma.booking.create({
              data: {
                  roomId: room.id,
                  slotId: slot.id,
                  guestId: guest.id,
                  bookingDate: new Date(targetDate.getTime() - getRandomInt(1, 10) * msPerDay),
                  checkIn: targetDate,
                  checkOut: checkOutDate,
                  numberOfGuests: getRandomInt(1, 3),
                  totalAmount: room.basePrice + getRandomInt(0, 500),
                  advanceAmount: room.basePrice,
                  status: status as any,
                  paymentStatus: 'PAID',
              }
          })
          
          totalBookings++
      }
      if (i % 10 === 0) console.log(`... ${i} days remaining to insert`)
  }

  console.log(`Successfully generated ${totalBookings} records! Dashboard is now fully populated.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
