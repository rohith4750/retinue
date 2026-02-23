import { Prisma } from "@prisma/client";

/**
 * Checks if a guest name indicates a testing guest.
 * Case-insensitive check for "testing".
 */
export function isTestingGuest(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().includes("testing");
}

/**
 * Standard Prisma filter to exclude 'testing' guests from bookings.
 * Used in where clauses: { ...otherFilters, ...excludeTestingGuestsFilter }
 */
export const excludeTestingGuestsFilter = {
  guest: {
    name: {
      not: {
        contains: "testing",
      },
      mode: Prisma.QueryMode.insensitive,
    },
  },
};

/**
 * Standard Prisma filter to exclude 'testing' guests from function hall bookings.
 * Used in where clauses for FunctionHallBooking.
 */
export const excludeTestingHallGuestsFilter = {
  customerName: {
    not: {
      contains: "testing",
    },
    mode: Prisma.QueryMode.insensitive,
  },
};
