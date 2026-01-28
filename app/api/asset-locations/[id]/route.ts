import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - Get single asset location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow RECEPTIONIST, ADMIN, SUPER_ADMIN to view
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const { id } = await params

    const assetLocation = await prisma.assetLocation.findUnique({
      where: { id },
      include: {
        inventory: true,
        room: true,
        functionHall: true,
      },
    })

    if (!assetLocation) {
      return NextResponse.json(
        { success: false, message: 'Asset location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: assetLocation,
    })
  } catch (error) {
    console.error('Get asset location error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch asset location' },
      { status: 500 }
    )
  }
}

// PUT - Update asset location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow RECEPTIONIST, ADMIN, SUPER_ADMIN to update
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const { id } = await params
    const body = await request.json()
    const {
      roomId,
      functionHallId,
      quantity,
      condition,
      notes,
    } = body

    const existing = await prisma.assetLocation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Asset location not found' },
        { status: 404 }
      )
    }

    const assetLocation = await prisma.assetLocation.update({
      where: { id },
      data: {
        ...(roomId !== undefined && { roomId: roomId || null }),
        ...(functionHallId !== undefined && { functionHallId: functionHallId || null }),
        ...(quantity !== undefined && { quantity: parseInt(quantity) }),
        ...(condition && { condition }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        inventory: true,
        room: true,
        functionHall: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Asset location updated successfully',
      data: assetLocation,
    })
  } catch (error) {
    console.error('Update asset location error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update asset location' },
      { status: 500 }
    )
  }
}

// DELETE - Remove asset from location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Allow ADMIN and SUPER_ADMIN to delete
    const authResult = await requireAuth('ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const { id } = await params

    const existing = await prisma.assetLocation.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Asset location not found' },
        { status: 404 }
      )
    }

    await prisma.assetLocation.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Asset removed from location successfully',
    })
  } catch (error) {
    console.error('Delete asset location error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove asset from location' },
      { status: 500 }
    )
  }
}
