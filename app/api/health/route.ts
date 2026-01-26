import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health check endpoint to verify database connection
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Try to query a simple table to verify schema exists
    const userCount = await prisma.user.count().catch(() => null)
    
    await prisma.$disconnect()
    
    return Response.json({
      status: 'ok',
      database: 'connected',
      tablesExist: userCount !== null,
      userCount: userCount ?? 'N/A',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return Response.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error?.message || 'Unknown error',
        message: 'Database connection failed. Please check your DATABASE_URL environment variable.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
