import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const paymentStatusParam = searchParams.get("paymentStatus");
    const paymentStatus =
      paymentStatusParam &&
      ["PENDING", "PAID", "PARTIAL"].includes(paymentStatusParam)
        ? paymentStatusParam
        : undefined;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      status: { notIn: ["CANCELLED", "CHECKED_OUT"] }, // Default to active bills
    };

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: "insensitive" } },
        { guest: { name: { contains: search, mode: "insensitive" } } },
        { guest: { phone: { contains: search, mode: "insensitive" } } },
        { room: { roomNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 1. Fetch Distinct "Bill Headers" (Group by Guest + CheckIn + CheckOut)
    // This gives us one representative booking per group.
    const [billHeaders, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        distinct: ["guestId", "checkIn", "checkOut"],
        skip,
        take: limit,
        include: {
          guest: true,
          room: true,
        },
        orderBy: { checkIn: "desc" },
      }),
      // Count unique groups - approximating count by distinct ID fetch
      // Since precise count with complex distinct is tricky in Prisma, we use filtering on distinct fields
      prisma.booking
        .findMany({
          where,
          distinct: ["guestId", "checkIn", "checkOut"],
          select: { id: true },
        })
        .then((res) => res.length),
    ]);

    // 2. Hydrate with consolidated totals
    const consolidatedBills = await Promise.all(
      billHeaders.map(async (header) => {
        // Find siblings (same guest, same dates, excluding self is NOT needed as we want total count)
        const siblings = await prisma.booking.findMany({
          where: {
            guestId: header.guestId,
            checkIn: header.checkIn,
            checkOut: header.checkOut,
            status: { notIn: ["CANCELLED"] },
          },
          include: { room: true },
        });

        // Aggregate
        const totalAmount = siblings.reduce((sum, b) => sum + b.totalAmount, 0);
        const paidAmount = siblings.reduce((sum, b) => sum + b.paidAmount, 0);

        // Recalculate balance to be safe
        const calculatedBalance = Math.max(0, totalAmount - paidAmount);

        // Determine overall payment status
        let status = "PENDING";
        if (calculatedBalance <= 0) status = "PAID";
        else if (paidAmount > 0) status = "PARTIAL";

        const roomNumbers = siblings.map((b) => b.room.roomNumber).sort();

        return {
          ...header,
          // Overwrite with consolidated values
          totalAmount,
          paidAmount,
          balanceAmount: calculatedBalance,
          paymentStatus: status,
          // Extra info for frontend
          roomCount: siblings.length,
          roomNumbers,
          isConsolidated: siblings.length > 1,
          // Use primary room + count
          primaryRoom: header.room,
          displayRoomNumber:
            siblings.length > 1
              ? `${header.room.roomNumber} + ${siblings.length - 1}`
              : header.room.roomNumber,
        };
      }),
    );

    // Calculate Summary Stats (Optional - returning 0 for now to keep it lightweight)
    const summary = {
      totalRevenue: 0,
    };

    return Response.json(
      successResponse({
        data: consolidatedBills,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary,
      }),
    );
  } catch (error) {
    console.error("Error fetching bills:", error);
    return Response.json(
      errorResponse("Server error", "Failed to fetch bills"),
      { status: 500 },
    );
  }
}
