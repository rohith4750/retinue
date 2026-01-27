import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - List all asset locations with filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const searchParams = request.nextUrl.searchParams
    const roomId = searchParams.get('roomId')
    const functionHallId = searchParams.get('functionHallId')
    const inventoryId = searchParams.get('inventoryId')
    const unassigned = searchParams.get('unassigned')

    const where: any = {}

    if (roomId) where.roomId = roomId
    if (functionHallId) where.functionHallId = functionHallId
    if (inventoryId) where.inventoryId = inventoryId
    if (unassigned === 'true') {
      where.roomId = null
      where.functionHallId = null
    }

    const assetLocations = await prisma.assetLocation.findMany({
      where,
      include: {
        inventory: true,
        room: true,
        functionHall: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get summary by location
    const roomSummary = await prisma.assetLocation.groupBy({
      by: ['roomId'],
      _sum: { quantity: true },
      _count: true,
      where: { roomId: { not: null } },
    })

    const hallSummary = await prisma.assetLocation.groupBy({
      by: ['functionHallId'],
      _sum: { quantity: true },
      _count: true,
      where: { functionHallId: { not: null } },
    })

    return NextResponse.json({
      success: true,
      data: assetLocations,
      summary: {
        totalAssets: assetLocations.length,
        totalQuantity: assetLocations.reduce((sum, a) => sum + a.quantity, 0),
        roomsWithAssets: roomSummary.length,
        hallsWithAssets: hallSummary.length,
      },
    })
  } catch (error) {
    console.error('Get asset locations error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch asset locations' },
      { status: 500 }
    )
  }
}

// POST - Create/Assign asset to location
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const {
      inventoryId,
      roomId,
      functionHallId,
      quantity,
      condition = 'GOOD',
      notes,
    } = body

    // Validation
    if (!inventoryId || !quantity) {
      return NextResponse.json(
        { success: false, message: 'Inventory item and quantity are required' },
        { status: 400 }
      )
    }

    if (!roomId && !functionHallId) {
      return NextResponse.json(
        { success: false, message: 'Either room or function hall must be specified' },
        { status: 400 }
      )
    }

    // Check if inventory exists and is an asset
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    })

    if (!inventory) {
      return NextResponse.json(
        { success: false, message: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Check if this asset is already assigned to this location
    const existingLocation = await prisma.assetLocation.findFirst({
      where: {
        inventoryId,
        ...(roomId ? { roomId } : {}),
        ...(functionHallId ? { functionHallId } : {}),
      },
    })

    if (existingLocation) {
      // Update quantity instead of creating duplicate
      const updated = await prisma.assetLocation.update({
        where: { id: existingLocation.id },
        data: {
          quantity: existingLocation.quantity + parseInt(quantity),
          condition,
          notes,
        },
        include: {
          inventory: true,
          room: true,
          functionHall: true,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Asset location updated (quantity added)',
        data: updated,
      })
    }

    // Create new asset location
    const assetLocation = await prisma.assetLocation.create({
      data: {
        inventoryId,
        roomId: roomId || null,
        functionHallId: functionHallId || null,
        quantity: parseInt(quantity),
        condition,
        notes: notes || null,
      },
      include: {
        inventory: true,
        room: true,
        functionHall: true,
      },
    })

    // Mark inventory as asset if not already
    if (!inventory.isAsset) {
      await prisma.inventory.update({
        where: { id: inventoryId },
        data: { isAsset: true },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Asset assigned to location successfully',
      data: assetLocation,
    })
  } catch (error) {
    console.error('Create asset location error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to assign asset to location' },
      { status: 500 }
    )
  }
}
