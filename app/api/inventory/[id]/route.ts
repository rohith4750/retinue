import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET /api/inventory/[id] - Get single inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    const item = await prisma.inventory.findUnique({
      where: { id }
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory/[id] - Update inventory item (SUPER_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params
    const body = await request.json()
    const { itemName, category, quantity, unit, minStock } = body

    // Check if item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        itemName: itemName || existingItem.itemName,
        category: category || existingItem.category,
        quantity: quantity !== undefined ? parseInt(quantity) : existingItem.quantity,
        unit: unit || existingItem.unit,
        minStock: minStock !== undefined ? parseInt(minStock) : existingItem.minStock,
      }
    })

    return NextResponse.json({ success: true, data: updatedItem })
  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory/[id] - Delete inventory item (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) {
      return authResult
    }

    const { id } = await params

    // Check if item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Check if item has asset locations
    const assetLocations = await prisma.assetLocation.count({
      where: { inventoryId: id }
    })

    if (assetLocations > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete item with assigned asset locations. Remove asset assignments first.' },
        { status: 400 }
      )
    }

    await prisma.inventory.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Inventory item deleted successfully' })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}
