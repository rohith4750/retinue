import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

// GET /api/inventory - List all inventory items
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult

    const items = await prisma.inventory.findMany({
      orderBy: { itemName: 'asc' },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    // Check for low stock
    const lowStockItems = items.filter((item: { quantity: number; minStock: number }) => item.quantity <= item.minStock)

    return Response.json(successResponse({ items, lowStockItems }))
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to fetch inventory'),
      { status: 500 }
    )
  }
}

// POST /api/inventory - Create inventory item (Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const data = await request.json()
    const { itemName, category, quantity, unit, minStock } = data

    if (!itemName || !category || quantity === undefined || !unit || minStock === undefined) {
      return Response.json(
        errorResponse('Validation error', 'Missing required fields'),
        { status: 400 }
      )
    }

    const item = await prisma.inventory.create({
      data: {
        itemName,
        category,
        quantity: parseInt(quantity),
        unit,
        minStock: parseInt(minStock),
      },
    })

    return Response.json(successResponse(item, 'Inventory item created successfully'))
  } catch (error) {
    console.error('Error creating inventory item:', error)
    return Response.json(
      errorResponse('Server error', 'Failed to create inventory item'),
      { status: 500 }
    )
  }
}
