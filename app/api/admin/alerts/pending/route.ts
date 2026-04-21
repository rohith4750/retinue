import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth("ADMIN")(request);
    if (authResult instanceof Response) return authResult;

    // Fetch rooms bookings with pending payment
    const roomBookings = await prisma.booking.findMany({
      where: {
        paymentStatus: { in: ["PENDING", "PARTIAL"] },
        status: { in: ["CHECKED_OUT", "CHECKED_IN"] }, // Checked out guests with balance are priority
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
