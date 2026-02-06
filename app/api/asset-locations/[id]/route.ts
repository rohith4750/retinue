import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// PATCH - Update asset location (e.g., condition, quantity, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const id = params.id
    const body = await request.json()
    const { condition, notes, quantity } = body

    // Validation
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Asset location ID is required' },
        { status: 400 }
      )
    }

    // @ts-ignore - Prisma types may not include AssetLocation
    const updated = await (prisma.assetLocation as any).update({
      where: { id },
      data: {
        ...(condition ? { condition } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(quantity ? { quantity } : {}),
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
      data: updated,
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
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth('RECEPTIONIST')(request)
    if (authResult instanceof Response) return authResult

    const id = params.id

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Asset location ID is required' },
        { status: 400 }
      )
    }

    // @ts-ignore - Prisma types may not include AssetLocation
    await (prisma.assetLocation as any).delete({
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
