import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-helpers";
import {
  createBookingSchema,
  validateBookingDates,
  checkDateConflicts,
  calculateBookingPrice,
} from "@/lib/booking-validators";
import {
  BookingError,
  RoomUnavailableError,
  DateConflictError,
  InvalidDateError,
} from "@/lib/booking-errors";
import { logBookingChange } from "@/lib/booking-audit";
import {
  generateBookingId,
  generateBookingReference,
} from "@/lib/booking-id-generator";
import { notifyInternalRoomBooked } from "@/lib/booking-alerts";

/**
 * POST /api/public/bookings
 * Public create booking (no auth). Sets source: 'ONLINE'. Returns bookingId + bookingReference.
 * Body: roomId, guestName, guestPhone, checkIn, checkOut, guestIdProof?, guestAddress?, numberOfGuests?
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const roomId = data.roomId;

    if (!roomId) {
      return Response.json(
        errorResponse("VALIDATION_ERROR", "roomId is required"),
        { status: 400 },
      );
    }

    const validationResult = createBookingSchema.safeParse({
      ...data,
      roomId,
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
    let checkInDate = new Date(validatedData.checkIn);
    let checkOutDate = new Date(validatedData.checkOut);

    if (validatedData.checkIn.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkInDate.setHours(0, 0, 0, 0);
    }
    if (validatedData.checkOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
      checkOutDate.setHours(23, 59, 59, 999);
    }

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return Response.json(
        errorResponse("VALIDATION_ERROR", "Invalid check-in or check-out date"),
        { status: 400 },
      );
    }

    const dateValidation = validateBookingDates(checkInDate, checkOutDate);
    if (!dateValidation.valid) {
      return Response.json(
        errorResponse(
          "VALIDATION_ERROR",
          dateValidation.error || "Invalid dates",
        ),
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx: any) => {
        const guest = await tx.guest.create({
          data: {
            name: validatedData.guestName,
            phone: validatedData.guestPhone,
            idProof: validatedData.guestIdProof,
            idProofType: data.guestIdProofType || "AADHAR",
            guestType: "WALK_IN",
            address: validatedData.guestAddress,
          },
        });

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

        const conflictCheck = await checkDateConflicts(
          roomId,
          checkInDate,
          checkOutDate,
        );
        if (conflictCheck.hasConflict) {
          throw new DateConflictError(
            `Room ${room.roomNumber} is already booked for the selected dates`,
          );
        }

        const checkInDateOnly = new Date(checkInDate);
        checkInDateOnly.setHours(0, 0, 0, 0);

        const slot = await tx.roomSlot.upsert({
          where: {
            roomId_date_slotType: {
              roomId,
              date: checkInDateOnly,
              slotType: "FULL_DAY",
            },
          },
          create: {
            roomId,
            date: checkInDateOnly,
            slotType: "FULL_DAY",
            price: room.basePrice,
            isAvailable: false,
          },
          update: {
            isAvailable: false,
            price: room.basePrice,
          },
        });

        const priceCalculation = calculateBookingPrice(
          room.basePrice,
          checkInDate,
          checkOutDate,
          parseFloat(String(validatedData.discount)) || 0,
        );

        const applyGst = data.applyGst !== false;
        const effectiveTax = applyGst ? priceCalculation.tax : 0;
        const effectiveTotal = applyGst
          ? priceCalculation.totalAmount
          : priceCalculation.subtotal;
        const advancePerRoom = parseFloat(String(data.advanceAmount)) || 0;
        const balanceForRoom = effectiveTotal - advancePerRoom;
        const gstPerRoom = applyGst ? priceCalculation.tax : 0;

        const [bookingId, bookingReference] = await Promise.all([
          generateBookingId(tx),
          generateBookingReference(tx),
        ]);

        const billNumber = `BILL-${Date.now()}-${roomId.slice(-4)}`;

        const booking = await tx.booking.create({
          data: {
            id: bookingId,
            roomId,
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
            source: "ONLINE",
            bookingReference,
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
            guest: true,
          },
        });

        const now = new Date();
        if (checkInDate <= now) {
          await tx.room.update({
            where: { id: roomId },
            data: { status: "BOOKED" },
          });
        }

        await logBookingChange(
          booking.id,
          "CREATED",
          undefined,
          [
            { field: "source", oldValue: null, newValue: "ONLINE" },
            {
              field: "bookingReference",
              oldValue: null,
              newValue: bookingReference,
            },
            { field: "checkIn", oldValue: null, newValue: checkInDate },
            { field: "checkOut", oldValue: null, newValue: checkOutDate },
            { field: "totalAmount", oldValue: null, newValue: effectiveTotal },
          ],
          `Online booking created. Reference: ${bookingReference}.`,
          tx,
        );

        return {
          booking,
          bookingReference,
          guestName: guest.name,
          guestPhone: guest.phone,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );

    await notifyInternalRoomBooked({
      guestName: result.guestName,
      guestPhone: result.guestPhone,
      roomNumber: result.booking.room.roomNumber,
      roomType: result.booking.room.roomType,
      checkIn: result.booking.checkIn,
      checkOut: result.booking.checkOut,
      bookingReference: result.bookingReference,
      totalAmount: result.booking.totalAmount,
      source: "ONLINE",
    });

    return Response.json(
      successResponse({
        bookingId: result.booking.id,
        bookingReference: result.bookingReference,
        guestName: result.guestName,
        guestPhone: result.guestPhone,
        checkIn: result.booking.checkIn,
        checkOut: result.booking.checkOut,
        roomNumber: result.booking.room.roomNumber,
        roomType: result.booking.room.roomType,
        totalAmount: result.booking.totalAmount,
        status: result.booking.status,
        message:
          "Booking created. Save your booking reference to view your booking.",
      }),
      { status: 201 },
    );
  } catch (error: any) {
    if (error instanceof BookingError) {
      return Response.json(errorResponse(error.code, error.message), {
        status: error.statusCode,
      });
    }
    console.error("Error creating public booking:", error);
    return Response.json(
      errorResponse("INTERNAL_ERROR", "An unexpected error occurred"),
      { status: 500 },
    );
  }
}
