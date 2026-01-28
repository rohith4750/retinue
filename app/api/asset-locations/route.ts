import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - List all asset locations with filters
export async function GET(request: NextRequest) {
  try {
    // Allow RECEPTIONIST, ADMIN, SUPER_ADMIN to view asset locations
    const authResult = await requireAuth('RECEPTIONIST')(request)
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

    // @ts-ignore - Prisma types may not include AssetLocation relations
    const assetLocations = await (prisma.assetLocation as any).findMany({
      where,
      include: {
        inventory: true,
        room: true,
        functionHall: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get summary by location
    // @ts-ignore - Prisma types may not include AssetLocation
    const roomSummary = await (prisma.assetLocation as any).groupBy({
      by: ['roomId'],
      _sum: { quantity: true },
      _count: true,
      where: { roomId: { not: null } },
    })

    // @ts-ignore - Prisma types may not include AssetLocation
    const hallSummary = await (prisma.assetLocation as any).groupBy({
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
        totalQuantity: assetLocations.reduce((sum: number, a: any) => sum + a.quantity, 0),
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
    // Allow RECEPTIONIST, ADMIN, SUPER_ADMIN to assign assets
    const authResult = await requireAuth('RECEPTIONIST')(request)
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
    // @ts-ignore - Prisma types may not include AssetLocation
    const existingLocation = await (prisma.assetLocation as any).findFirst({
      where: {
        inventoryId,
        ...(roomId ? { roomId } : {}),
        ...(functionHallId ? { functionHallId } : {}),
      },
    })

    if (existingLocation) {
      // Update quantity instead of creating duplicate
      // @ts-ignore - Prisma types may not include AssetLocation
      const updated = await (prisma.assetLocation as any).update({
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
    // @ts-ignore - Prisma types may not include AssetLocation
    const assetLocation = await (prisma.assetLocation as any).create({
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
    // @ts-ignore - isAsset field may not be in Prisma types
    if (!(inventory as any).isAsset) {
      // @ts-ignore - isAsset field may not be in Prisma types
      await (prisma.inventory as any).update({
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
