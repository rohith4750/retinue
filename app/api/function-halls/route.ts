import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/function-halls - List all function halls
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const halls = await prisma.functionHall.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { bookings: true }
        }
      }
    })

    return Response.json(successResponse(halls))
  } catch (error) {
    console.error('Error fetching function halls:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch function halls'),
      { status: 500 }
    )
  }
}

// POST /api/function-halls - Create new function hall
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { name, capacity, pricePerDay, pricePerHour, amenities, description } = data

    // Validation
    if (!name || !capacity || !pricePerDay) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Name, capacity, and price per day are required'),
        { status: 400 }
      )
    }

    // Check if hall name already exists
    const existingHall = await prisma.functionHall.findUnique({
      where: { name }
    })

    if (existingHall) {
      return Response.json(
        errorResponse('DUPLICATE_ERROR', 'A function hall with this name already exists'),
        { status: 400 }
      )
    }

    const hall = await prisma.functionHall.create({
      data: {
        name,
        capacity: parseInt(capacity),
        pricePerDay: parseFloat(pricePerDay),
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        amenities: amenities || null,
        description: description || null,
      }
    })

    return Response.json(successResponse(hall, 'Function hall created successfully'))
  } catch (error: any) {
    console.error('Error creating function hall:', error)
    return Response.json(
      errorResponse('Server error', error.message || 'Failed to create function hall'),
      { status: 500 }
    )
  }
}
