// Note: Run 'npx prisma generate' to generate Prisma client types
// @ts-ignore - PrismaClient will be available after running prisma generate
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force new instance to pick up updated DATABASE_URL
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  // Clear cached instance to force reconnection with new DATABASE_URL
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect()
  }
  globalForPrisma.prisma = prisma
}
