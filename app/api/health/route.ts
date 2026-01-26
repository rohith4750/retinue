import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health check endpoint to verify database connection
 * GET /api/health
 */
export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL
  const hasDatabaseUrl = !!databaseUrl
  const databaseUrlPreview = hasDatabaseUrl && databaseUrl
    ? databaseUrl.substring(0, 30) + '...' 
    : 'NOT SET'
  
  try {
    if (!hasDatabaseUrl || !databaseUrl) {
      return Response.json(
        {
          status: 'error',
          database: 'disconnected',
          error: 'DATABASE_URL environment variable is not set',
          message: 'DATABASE_URL is missing. Please add it in Vercel Settings → Environment Variables.',
          databaseUrlPreview: 'NOT SET',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    // Check if URL format is correct
    const dbUrl = databaseUrl
    if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
      return Response.json(
        {
          status: 'error',
          database: 'disconnected',
          error: 'Invalid DATABASE_URL format',
          message: 'DATABASE_URL must start with postgresql:// or postgres://',
          databaseUrlPreview: dbUrl ? dbUrl.substring(0, 50) + '...' : 'INVALID',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

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
      databaseUrlPreview,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error'
    
    return Response.json(
      {
        status: 'error',
        database: 'disconnected',
        error: errorMessage,
        message: 'Database connection failed. Please check your DATABASE_URL environment variable.',
        databaseUrlPreview,
        hasDatabaseUrl,
        timestamp: new Date().toISOString(),
        // Additional debug info
        errorDetails: errorMessage.includes('P1001') 
          ? 'Connection refused - Check if database is running and accessible'
          : errorMessage.includes('P1000') 
          ? 'Authentication failed - Check username and password'
          : errorMessage.includes('protocol')
          ? 'Invalid connection string format - Must start with postgresql://'
          : 'Check DATABASE_URL in Vercel environment variables',
      },
      { status: 500 }
    )
  }
}
