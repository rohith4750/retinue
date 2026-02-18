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
      status: { notIn: ["CANCELLED"] }, // Default to active bills
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

    // 1. Fetch ALL matching bookings (non-cancelled and potentially non-checked-out)
    // We group in memory because Prisma distinct doesn't support nested fields like guest.phone
    const allBookings = await prisma.booking.findMany({
      where,
      include: {
        guest: true,
        room: true,
      },
      orderBy: { checkIn: "desc" },
    });

    // 2. Group by Guest Phone
    const groups = new Map<string, any[]>();
    allBookings.forEach((b) => {
      const phone = b.guest?.phone || b.guestId;
      if (!groups.has(phone)) {
        groups.set(phone, []);
      }
      groups.get(phone)!.push(b);
    });

    const uniqueGroups = Array.from(groups.values());
    const total = uniqueGroups.length;

    // 3. Paginate and Hydrate
    const paginatedGroups = uniqueGroups.slice(skip, skip + limit);

    const consolidatedBills = paginatedGroups.map((siblings) => {
      const header = siblings[0]; // Representative (latest check-in)

      // Aggregate
      const totalAmount = siblings.reduce((sum, b) => sum + b.totalAmount, 0);
      const paidAmount = siblings.reduce((sum, b) => sum + b.paidAmount, 0);
      const calculatedBalance = Math.max(0, totalAmount - paidAmount);

      // Determine overall payment status
      let status = "PENDING";
      if (calculatedBalance <= 0) status = "PAID";
      else if (paidAmount > 0) status = "PARTIAL";

      const roomNumbers = siblings
        .map((b) => b.room.roomNumber)
        .sort()
        .filter((v, i, a) => a.indexOf(v) === i); // Unique room numbers

      return {
        ...header,
        totalAmount,
        paidAmount,
        balanceAmount: calculatedBalance,
        paymentStatus: status,
        roomCount: siblings.length,
        roomNumbers,
        isConsolidated: siblings.length > 1,
        primaryRoom: header.room,
        displayRoomNumber:
          siblings.length > 1
            ? `${header.room.roomNumber} + ${siblings.length - 1}`
            : header.room.roomNumber,
      };
    });

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
