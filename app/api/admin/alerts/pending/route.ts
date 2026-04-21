import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth("ADMIN")(request);
    if (authResult instanceof Response) return authResult;

    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const endOfToday = new Date(now.setHours(23, 59, 59, 999));

    // Fetch rooms bookings that need attention:
    // 1. Pending payment (PARTIAL/PENDING)
    // 2. Checking in today
    // 3. Checking out today
    // 4. Overdue check-outs (past checkout timestamp but still checked in)
    const roomBookings = await prisma.booking.findMany({
      where: {
        OR: [
          { paymentStatus: { in: ["PENDING", "PARTIAL"] }, status: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
          { checkIn: { gte: startOfToday, lte: endOfToday } },
          { checkOut: { gte: startOfToday, lte: endOfToday } },
          { checkOut: { lt: startOfToday }, status: "CHECKED_IN" }, // Overdue
        ],
      },
      include: {
        guest: true,
        room: true,
      },
      orderBy: { checkOut: "desc" },
    });

    // Optionally handle convention bookings too if they have paymentStatus
    // For now, focusing on hotel bookings as requested in "bills" context

    const formatted = roomBookings.map((b) => ({
      id: b.id,
      type: "ROOM",
      guestName: b.guest?.name || "Unknown",
      guestPhone: b.guest?.phone || "N/A",
      reference: b.bookingReference || b.id,
      roomNumber: b.room?.roomNumber || "N/A",
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      totalAmount: b.totalAmount,
      balanceAmount: b.balanceAmount || 0,
      paymentStatus: b.paymentStatus,
      status: b.status,
    }));

    return Response.json(successResponse(formatted));
  } catch (error) {
    console.error("Error fetching pending bills:", error);
    return Response.json(
      errorResponse("SERVER_ERROR", "Failed to fetch pending bills"),
      { status: 500 }
    );
  }
}
