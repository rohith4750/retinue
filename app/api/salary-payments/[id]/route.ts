import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

// PUT - Update salary payment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Allow ADMIN and above to update salary payments
    const authResult = await requireAuth("ADMIN")(request);
    if (authResult instanceof Response) return authResult;

    const body = await request.json();
    const {
      amount,
      bonus = 0,
      deductions = 0,
      paymentDate,
      paymentMethod,
      notes,
    } = body;

    const id = params.id;

    // Check if payment exists
    const existingPayment = await prisma.salaryPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, message: "Salary payment not found" },
        { status: 404 },
      );
    }

    const netAmount =
      parseFloat(amount) + parseFloat(bonus || 0) - parseFloat(deductions || 0);

    const payment = await (prisma as any).salaryPayment.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        bonus: parseFloat(bonus || 0),
        deductions: parseFloat(deductions || 0),
        netAmount,
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      },
      include: {
        staff: {
          select: {
            name: true,
            role: true,
            businessUnit: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Salary payment updated successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Update salary payment error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update salary payment" },
      { status: 500 },
    );
  }
}

// DELETE - Delete salary payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Allow ADMIN and above to delete salary payments
    const authResult = await requireAuth("ADMIN")(request);
    if (authResult instanceof Response) return authResult;

    const id = params.id;

    // Check if payment exists
    const existingPayment = await prisma.salaryPayment.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, message: "Salary payment not found" },
        { status: 404 },
      );
    }

    await prisma.salaryPayment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Salary payment deleted successfully",
    });
  } catch (error) {
    console.error("Delete salary payment error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete salary payment" },
      { status: 500 },
    );
  }
}
