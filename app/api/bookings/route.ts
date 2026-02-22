import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = "SUPER_ADMIN" | "ADMIN" | "RECEPTIONIST" | "STAFF";
import {
  createBookingSchema,
  validateBookingDates,
  checkDateConflicts,
  isRoomAvailable,
  calculateBookingPrice,
} from "@/lib/booking-validators";
import {
  BookingError,
  RoomUnavailableError,
  DateConflictError,
  InvalidDateError,
  ValidationError,
} from "@/lib/booking-errors";
import { logBookingChange } from "@/lib/booking-audit";
import {
  generateBookingId,
  generateBookingReference,
  generateBillNumber,
} from "@/lib/booking-id-generator";
import { notifyInternalRoomBooked } from "@/lib/booking-alerts";
import type { RoomBookedSourceRole } from "@/lib/email";

// GET /api/bookings - List all bookings with pagination and global stats
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request);
    if (authResult instanceof Response) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const search = searchParams.get("search");
    const source = searchParams.get("source");
    // Payment status filter (PENDING, PAID, PARTIAL)
    const paymentStatusParam = searchParams.get("paymentStatus");
    const paymentStatus =
      paymentStatusParam &&
      ["PENDING", "PAID", "PARTIAL"].includes(paymentStatusParam)
        ? paymentStatusParam
        : undefined;

    const quickFilter = searchParams.get("quickFilter"); // 'checkin_today', 'checkout_today', 'in_house'
    const forCalendar =
      searchParams.get("forCalendar") === "1" ||
      searchParams.get("includeOnline") === "1";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {
      // Default: show active (exclude CANCELLED) UNLESS filtering specifically
      // But if quickFilter is set, we might want to override this default behavior
      ...(status ? { status } : { status: { notIn: ["CANCELLED"] } }),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(forCalendar ? {} : { source: { not: "ONLINE" } }),
    };

    if (source === "online" && !forCalendar) {
      where.source = "ONLINE";
    }

    // Date filter (specific date) - find ALL bookings active on this date (overlap)
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Check for overlap: checkIn < endOfDay AND checkOut > startOfDay
      where.AND = [
        ...(where.AND || []),
        { checkIn: { lt: endOfDay } },
        { checkOut: { gt: startOfDay } },
      ];
    }

    // Date Range filter (from/to)
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Find valid bookings that OVERLAP with the requested range
      // Overlap: checkIn < toDate AND checkOut > fromDate
      // We assume from/to include times or are dates. If dates, we might want to cover full days.
      // Let's assume the caller passes ISO strings or dates.
      // If we want "bookings active in this range":
      where.AND = [
        ...(where.AND || []),
        { checkIn: { lt: toDate } },
        { checkOut: { gt: fromDate } },
      ];
    }

    // Quick Filters (Server-side)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (quickFilter === "checkin_today") {
      where.checkIn = { gte: todayStart, lte: todayEnd };
      delete where.status; // Allow finding checked-out bookings if they checked in today (rare but possible) or any status
    } else if (quickFilter === "checkout_today") {
      where.checkOut = { gte: todayStart, lte: todayEnd };
      delete where.status;
    } else if (quickFilter === "in_house") {
      where.status = "CHECKED_IN";
    } else if (quickFilter === "all") {
      delete where.status; // Show everything
    }

    // Search functionality
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { billNumber: { contains: search, mode: "insensitive" } },
        { guest: { name: { contains: search, mode: "insensitive" } } },
        { guest: { phone: { contains: search, mode: "insensitive" } } },
        { room: { roomNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    // fetch data
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          room: true,
          slot: true,
          guest: true,
          history: {
            orderBy: { timestamp: "asc" },
            take: 20,
          },
        },
        orderBy: { bookingDate: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    // Calculate Global Stats (Independent of pagination/filters, but respecting source restrictions if any)
    // We want these stats to reflect the "whole hotel state" mostly, or at least be useful context.
    // Usually, dashboard stats should be global (e.g. Total Revenue for today, or Total In-House).
    // Let's calculate standard dashboard metrics:
    const statsWhere: any = forCalendar ? {} : { source: { not: "ONLINE" } };

    const [confirmedCount, checkedInCount, checkedOutCount, revenueAgg] =
      await Promise.all([
        prisma.booking.count({ where: { ...statsWhere, status: "CONFIRMED" } }),
        prisma.booking.count({
          where: { ...statsWhere, status: "CHECKED_IN" },
        }),
        prisma.booking.count({
          where: { ...statsWhere, status: "CHECKED_OUT" },
        }),
        prisma.booking.aggregate({
          where: statsWhere,
          _sum: { totalAmount: true },
        }),
      ]);

    return Response.json(
      successResponse({
        data: bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          confirmed: confirmedCount,
          checkedIn: checkedInCount,
          checkedOut: checkedOutCount,
          totalRevenue: revenueAgg._sum.totalAmount || 0,
        },
      }),
    );
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return Response.json(
      errorResponse("Server error", "Failed to fetch bookings"),
      { status: 500 },
    );
  }
}

// POST /api/bookings - Create new booking with all Phase 1-3 improvements
// Supports both single room (roomId) and multiple rooms (roomIds)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth("RECEPTIONIST")(request);
    if (authResult instanceof Response) return authResult;

    const userId = (authResult as any).userId; // Get user ID from auth

    const data = await request.json();

    // Single booking = one room. Support roomId (single) or roomIds (multi-room).
    // Deduplicate so we never create two bookings for the same room in one request.
    const rawRoomIds: string[] =
      data.roomIds || (data.roomId ? [data.roomId] : []);
    const roomIds = Array.from(new Set(rawRoomIds));

    if (roomIds.length === 0) {
      return Response.json(
        errorResponse("VALIDATION_ERROR", "At least one room must be selected"),
        { status: 400 },
      );
    }

    // Phase 1: Input validation with Zod (use first roomId for schema validation)
    const validationResult = createBookingSchema.safeParse({
      ...data,
      roomId: roomIds[0], // For schema validation
      totalAmount: parseFloat(data.totalAmount) || 0,
      discount: parseFloat(data.discount) || 0,
    });

    if (!validationResult.success) {
      return Response.json(
        errorResponse(
          "VALIDATION_ERROR",
          validationResult.error.errors[0]?.message || "Invalid input",
        ),
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;

    // Convert date strings to Date objects
    // Handle both date-only strings (YYYY-MM-DD) and ISO datetime strings
    let checkInDate = new Date(validatedData.checkIn);
    let checkOutDate = new Date(validatedData.checkOut);

    // If date-only string, set time to start/end of day
    if (validatedData.checkIn.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkInDate.setHours(0, 0, 0, 0);
    }
    if (validatedData.checkOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkOutDate.setHours(23, 59, 59, 999);
    }

    // Validate dates are valid
    if (isNaN(checkInDate.getTime())) {
      throw new InvalidDateError("Invalid check-in date format");
    }
    if (isNaN(checkOutDate.getTime())) {
      throw new InvalidDateError("Invalid check-out date format");
    }

    // Phase 1: Date validation
    const dateValidation = validateBookingDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
      throw new InvalidDateError(dateValidation.error || "Invalid dates");
    }

    // Phase 1: Transaction management - All operations in one transaction
    // Each booking gets its own guest record (snapshot). We do NOT find by phone and update,
    // so creating a new booking never overwrites an existing guest's name on other bookings.
    const result = await prisma.$transaction(
      async (tx: any) => {
        const guest = await tx.guest.create({
          data: {
            name: validatedData.guestName,
            phone: validatedData.guestPhone,
            idProof: validatedData.guestIdProof,
            idProofType: data.guestIdProofType || "AADHAR",
            guestType: data.guestType || "WALK_IN",
            address: validatedData.guestAddress,
          },
        });

        const bookings: any[] = [];

        // One booking per distinct room (roomIds already deduplicated above)
        const discountPerRoom =
          (parseFloat(String(validatedData.discount)) || 0) / roomIds.length;

        for (const roomId of roomIds) {
          // Check room availability
          const room = await tx.room.findUnique({
            where: { id: roomId },
          });

          if (!room) {
            throw new RoomUnavailableError(roomId, "Room not found");
          }

          if (room.status === "MAINTENANCE") {
            throw new RoomUnavailableError(
              roomId,
              `Room ${room.roomNumber} is under maintenance`,
            );
          }

          // Check for date conflicts
          const conflictCheck = await checkDateConflicts(
            roomId,
            checkInDate,
            checkOutDate,
          );

          if (conflictCheck.hasConflict) {
            throw new DateConflictError(
              `Room ${room.roomNumber} is already booked from ${conflictCheck.conflictingBooking?.checkIn} to ${conflictCheck.conflictingBooking?.checkOut}`,
            );
          }

          // Create a default FULL_DAY slot
          const checkInDateOnly = new Date(checkInDate);
          checkInDateOnly.setHours(0, 0, 0, 0);

          const slot = await tx.roomSlot.create({
            data: {
              roomId: roomId,
              date: checkInDateOnly,
              slotType: "FULL_DAY",
              price: room.basePrice,
              isAvailable: false,
            },
          });

          // Calculate price for this room
          const priceCalculation = calculateBookingPrice(
            room.basePrice,
            checkInDate,
            checkOutDate,
            discountPerRoom,
          );

          const applyGst = data.applyGst === true;
          const effectiveTax = applyGst ? priceCalculation.tax : 0;
          const effectiveTotal = applyGst
            ? priceCalculation.totalAmount
            : priceCalculation.subtotal;

          // Generate custom booking ID and short reference for "view my booking"
          const [bookingId, bookingReference] = await Promise.all([
            generateBookingId(tx),
            generateBookingReference(tx),
          ]);

          // Calculate advance and balance for this booking
          const advancePerRoom =
            (parseFloat(String(data.advanceAmount)) || 0) / roomIds.length;
          const gstPerRoom =
            (parseFloat(String(data.gstAmount)) || 0) / roomIds.length;
          const balanceForRoom = effectiveTotal - advancePerRoom;

          // Generate bill number (Sequential RETINUE-XXX)
          const billNumber = await generateBillNumber(tx);

          // Create booking with billing info (merged Bill fields)
          const booking = await tx.booking.create({
            data: {
              id: bookingId,
              roomId: roomId,
              slotId: slot.id,
              guestId: guest.id,
              checkIn: checkInDate,
              checkOut: checkOutDate,
              flexibleCheckout: data.flexibleCheckout || false,
              numberOfGuests: parseInt(String(data.numberOfGuests)) || 1,
              totalAmount: effectiveTotal,
              advanceAmount: advancePerRoom,
              balanceAmount: Math.max(0, balanceForRoom),
              gstAmount: gstPerRoom,
              applyGst,
              status: "CONFIRMED",
              source: "STAFF", // Management site (hoteltheretinue.in)
              bookingReference,
              // Billing fields (merged from Bill)
              billNumber,
              subtotal: priceCalculation.subtotal,
              tax: effectiveTax,
              discount: priceCalculation.discountAmount,
              paidAmount: advancePerRoom,
              paymentStatus:
                advancePerRoom >= effectiveTotal
                  ? "PAID"
                  : advancePerRoom > 0
                    ? "PARTIAL"
                    : "PENDING",
            },
            include: {
              room: true,
              slot: true,
              guest: true,
            },
          });

          // Update room status only if check-in is today or in the past
          // For future bookings, room remains AVAILABLE until check-in
          const now = new Date();
          const isCurrentOrPastBooking = checkInDate <= now;
          if (isCurrentOrPastBooking) {
            await tx.room.update({
              where: { id: roomId },
              data: { status: "BOOKED" },
            });
          }

          // Log booking creation with payment details (use tx so history is in same transaction)
          await logBookingChange(
            booking.id,
            "CREATED",
            userId,
            [
              { field: "status", oldValue: null, newValue: "CONFIRMED" },
              { field: "roomId", oldValue: null, newValue: roomId },
              { field: "checkIn", oldValue: null, newValue: checkInDate },
              { field: "checkOut", oldValue: null, newValue: checkOutDate },
              {
                field: "totalAmount",
                oldValue: null,
                newValue: effectiveTotal,
              },
              {
                field: "subtotal",
                oldValue: null,
                newValue: priceCalculation.subtotal,
              },
              { field: "tax", oldValue: null, newValue: effectiveTax },
              {
                field: "discount",
                oldValue: null,
                newValue: priceCalculation.discountAmount,
              },
              {
                field: "advanceAmount",
                oldValue: null,
                newValue: advancePerRoom,
              },
              { field: "paidAmount", oldValue: null, newValue: advancePerRoom },
              {
                field: "paymentStatus",
                oldValue: null,
                newValue:
                  advancePerRoom >= effectiveTotal
                    ? "PAID"
                    : advancePerRoom > 0
                      ? "PARTIAL"
                      : "PENDING",
              },
              { field: "billNumber", oldValue: null, newValue: billNumber },
            ],
            `Booking created for Room ${room.roomNumber}. Total ₹${effectiveTotal.toLocaleString()}, advance ₹${advancePerRoom.toLocaleString()} (${advancePerRoom >= effectiveTotal ? "PAID" : advancePerRoom > 0 ? "PARTIAL" : "PENDING"}).`,
            tx,
          );

          bookings.push(booking);
        }

        return { bookings, guest };
      },
      {
        maxWait: 10000, // Max time to wait for transaction to start
        timeout: 30000, // Max time for transaction to complete (30s for slow Neon connections)
      },
    );

    const first = result.bookings[0];
    const authUser = authResult as {
      username?: string;
      role: RoomBookedSourceRole;
    };
    await notifyInternalRoomBooked({
      guestName: result.guest.name,
      guestPhone: result.guest.phone,
      roomNumber: first.room.roomNumber,
      roomType: first.room.roomType,
      checkIn: first.checkIn,
      checkOut: first.checkOut,
      bookingReference: first.bookingReference ?? first.id,
      totalAmount: result.bookings.reduce(
        (s: number, b: any) => s + b.totalAmount,
        0,
      ),
      source: "STAFF",
      createdByUsername: authUser.username,
      createdByRole: authUser.role,
      isBatch: result.bookings.length > 1,
      rooms:
        result.bookings.length > 1
          ? result.bookings.map((b: any) => ({
              roomNumber: b.room.roomNumber,
              roomType: b.room.roomType,
            }))
          : undefined,
    });

    // Return response based on number of rooms
    if (result.bookings.length === 1) {
      return Response.json(
        successResponse(result.bookings[0], "Booking created successfully"),
      );
    }

    // Multiple rooms booked
    const totalAmount = result.bookings.reduce(
      (sum: number, booking: any) => sum + booking.totalAmount,
      0,
    );
    return Response.json(
      successResponse(
        {
          bookings: result.bookings,
          totalRooms: result.bookings.length,
          totalAmount,
          guest: result.guest,
        },
        `${result.bookings.length} rooms booked successfully`,
      ),
    );
  } catch (error: any) {
    // Phase 2: Comprehensive error handling
    if (error instanceof BookingError) {
      return Response.json(errorResponse(error.code, error.message), {
        status: error.statusCode,
      });
    }

    console.error("Error creating booking:", error);

    // Check for specific Prisma errors
    let detail = error.message || "An unexpected error occurred";
    if (error.code === "P2002") {
      detail = "A booking with this ID or reference already exists.";
    }

    return Response.json(errorResponse("INTERNAL_ERROR", detail), {
      status: 500,
    });
  }
}
