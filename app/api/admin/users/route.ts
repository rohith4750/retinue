import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth("ADMIN")(request);
    if (authResult instanceof Response) return authResult;

    const users = await prisma.user.findMany({
      where: {
        role: { in: ["RECEPTIONIST", "STAFF", "ADMIN", "SUPER_ADMIN"] },
        email: { not: null },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
      orderBy: { username: "asc" },
    });

    return Response.json(successResponse(users));
  } catch (error) {
    console.error("Error fetching internal users:", error);
    return Response.json(
      errorResponse("SERVER_ERROR", "Failed to fetch users"),
      { status: 500 }
    );
  }
}
