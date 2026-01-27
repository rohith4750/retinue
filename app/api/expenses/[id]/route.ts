import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

// GET - Get single expense
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const { id } = await params

    const expense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!expense) {
      return NextResponse.json(
        { success: false, message: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: expense,
    })
  } catch (error) {
    console.error('Get expense error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch expense' },
      { status: 500 }
    )
  }
}

// PUT - Update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const { id } = await params
    const body = await request.json()

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { success: false, message: 'Expense not found' },
        { status: 404 }
      )
    }

    const {
      businessUnit,
      category,
      description,
      amount,
      date,
      vendor,
      invoiceNumber,
      notes,
    } = body

    const updateData: any = {}

    if (businessUnit) updateData.businessUnit = businessUnit
    if (category) updateData.category = category
    if (description) updateData.description = description
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (vendor !== undefined) updateData.vendor = vendor || null
    if (invoiceNumber !== undefined) updateData.invoiceNumber = invoiceNumber || null
    if (notes !== undefined) updateData.notes = notes || null

    if (date) {
      const expenseDate = new Date(date)
      updateData.date = expenseDate
      updateData.month = expenseDate.getMonth() + 1
      updateData.year = expenseDate.getFullYear()
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense,
    })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth('SUPER_ADMIN')(request)
    if (authResult instanceof Response) return authResult

    const { id } = await params

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { success: false, message: 'Expense not found' },
        { status: 404 }
      )
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
