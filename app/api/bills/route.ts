import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
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

    const month = searchParams.get("month");
    const year = searchParams.get("year");
    if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.checkIn = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: "insensitive" } },
        { guest: { name: { contains: search, mode: "insensitive" } } },
        { guest: { phone: { contains: search, mode: "insensitive" } } },
        { room: { roomNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    // 1. Fetch matching bookings (non-cancelled)
    // We group in memory because Prisma distinct doesn't support nested fields like guest.phone
    // We limit to 1000 items as a safety measure for in-memory processing
    const allBookings = await prisma.booking.findMany({
      where,
      include: {
        guest: true,
        room: true,
      },
      orderBy: { checkIn: "desc" },
      take: 1000, 
    });

    // 2. Group by Guest Phone + ID Proof Type + ID Proof Value
    const groups = new Map<string, any[]>();
    allBookings.forEach((b) => {
      // Robust null check for guest relation
      const phone = b.guest?.phone || b.guestId || "no-phone";
      const idType = b.guest?.idProofType || "no-type";
      const idValue = b.guest?.idProof || "no-id";
      const key = `${phone}-${idType}-${idValue}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(b);
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
        .map((b) => b.room?.roomNumber)
        .filter(Boolean)
        .sort()
        .filter((v, i, a) => a.indexOf(v) === i); // Unique room numbers

      const primaryRoomNumber = header.room?.roomNumber || "N/A";

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
            ? `${primaryRoomNumber} + ${siblings.length - 1}`
            : primaryRoomNumber,
      };
    });

    // Calculate Summary Stats
    const stats = uniqueGroups.reduce((acc, siblings) => {
      const groupTotal = siblings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const groupPaid = siblings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
      const groupDiscount = siblings.reduce((sum, b) => sum + (b.discount || 0), 0);
      const groupPending = Math.max(0, groupTotal - groupPaid);
      
      return {
        totalPaid: acc.totalPaid + groupPaid,
        totalPending: acc.totalPending + groupPending,
        totalDiscount: acc.totalDiscount + groupDiscount
      };
    }, { totalPaid: 0, totalPending: 0, totalDiscount: 0 });

    const summary = {
      totalRevenue: stats.totalPaid,
      totalPending: stats.totalPending,
      totalDiscount: stats.totalDiscount
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
