const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBooking() {
  const booking = await prisma.booking.findFirst({
    where: { billNumber: 'RETINUE-00111' },
    include: { room: true }
  });
  console.log(JSON.stringify(booking, null, 2));
}

checkBooking().finally(() => prisma.$disconnect());
