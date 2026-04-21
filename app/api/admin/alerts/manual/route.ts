import { NextRequest } from "next/server";
import { errorResponse, successResponse, requireAuth } from "@/lib/api-helpers";
import { notifyCustomPendingAlert } from "@/lib/booking-alerts";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth("ADMIN")(request);
    if (authResult instanceof Response) return authResult;

    const body = await request.json();
    const { bookingId, recipientEmails, customNote } = body;

    if (!bookingId || !recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return Response.json(
        errorResponse("INVALID_REQUEST", "Booking ID and at least one recipient email are required"),
        { status: 400 }
      );
    }

    // Custom note support could be added to email template if needed, 
    // but for now using the standard pending template as per base requirement.
    
    const success = await notifyCustomPendingAlert(recipientEmails, bookingId);

    if (success) {
      return Response.json(successResponse(null, "Alerts sent successfully"));
    } else {
      return Response.json(
        errorResponse("SEND_ERROR", "Failed to send one or more alerts"),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending manual alert:", error);
    return Response.json(
      errorResponse("SERVER_ERROR", "Internal server error during alert sending"),
      { status: 500 }
    );
  }
}
