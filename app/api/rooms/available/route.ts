import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import moment from "moment";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

// GET /api/rooms/available - Get rooms available for specific dates
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const roomType = searchParams.get("roomType");

    // If no dates provided, return all available rooms (not in MAINTENANCE)
    if (!checkIn || !checkOut) {
      const rooms = await prisma.room.findMany({
        where: {
          status: { not: "MAINTENANCE" },
        },
        orderBy: { roomNumber: "asc" },
      });
      return Response.json(
        successResponse({
          rooms: rooms,
          dateRange: null,
          bookedRoomCount: 0,
          availableRoomCount: rooms.length,
        }),
      );
    }

    // Parse dates using IST
    const checkInDate = moment(checkIn).utcOffset("+05:30").toDate();
    const checkOutDate = moment(checkOut).utcOffset("+05:30").toDate();

    // Validate dates
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return Response.json(
        errorResponse("INVALID_DATE", "Invalid date format"),
        { status: 400 },
      );
    }

    if (checkOutDate <= checkInDate) {
      return Response.json(
        errorResponse("INVALID_DATE", "Check-out must be after check-in"),
        { status: 400 },
      );
    }

    // Time-based overlap using IST
    const now = moment().utcOffset("+05:30").toDate();
    const activeBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: ["PENDING", "CONFIRMED", "CHECKED_IN"],
        },
      },
      select: { roomId: true, checkIn: true, checkOut: true, status: true, guest: { select: { name: true } } },
    });

    const overlappingBookings = activeBookings.filter((b) => {
      const bCheckIn = new Date(b.checkIn);
      const bCheckOut = new Date(b.checkOut);
      const effectiveCheckOut =
        b.status === "CHECKED_IN" && bCheckOut < now ? now : bCheckOut;
      return bCheckIn < checkOutDate && effectiveCheckOut > checkInDate;
    });

    const bookedRoomsMap = new Map();
    for (const b of overlappingBookings) {
      const existing = bookedRoomsMap.get(b.roomId);
      if (!existing || new Date(b.checkOut) > new Date(existing.checkOut)) {
        bookedRoomsMap.set(b.roomId, b);
      }
    }

    const where: any = {};
    if (roomType) {
      where.roomType = roomType;
    }

    const allRooms = await prisma.room.findMany({
      where,
      orderBy: { roomNumber: "asc" },
    });

    const roomsWithStatus = allRooms.map((room) => {
      if (room.status === "MAINTENANCE") {
        return { ...room, status: "MAINTENANCE" as const };
      }
      
      const booking = bookedRoomsMap.get(room.id);
      if (booking) {
        return {
          ...room,
          status: "BOOKED" as const,
          currentBooking: {
            guestName: booking.guest?.name || 'Guest',
            checkInAt: booking.checkIn.toISOString(),
            checkOutAt: booking.checkOut.toISOString(),
          }
        };
      }
      return { ...room, status: "AVAILABLE" as const };
    });

    const availableCount = roomsWithStatus.filter(
      (r) => r.status === "AVAILABLE",
    ).length;
    const bookedCount = roomsWithStatus.filter(
      (r) => r.status === "BOOKED",
    ).length;

    return Response.json(
      successResponse({
        rooms: roomsWithStatus,
        dateRange: {
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
        },
        bookedRoomCount: bookedCount,
        availableRoomCount: availableCount,
      }),
    );
  } catch (error) {
    console.error("Error fetching available rooms:", error);
    return Response.json(
      errorResponse("Server error", "Failed to fetch available rooms"),
      { status: 500 },
    );
  }
}
