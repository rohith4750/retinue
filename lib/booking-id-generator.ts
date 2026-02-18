/**
 * Custom booking ID generator
 * Generates IDs in format: RETINU0123 (prefix + sequential number)
 */

import { prisma } from "./prisma";

const BOOKING_ID_PREFIX = "RETINU";
const ID_LENGTH = 4; // Number of digits after prefix

/**
 * Generate next booking ID
 * Format: RETINU0123, RETINU0124, etc.
 * @param tx - Optional transaction client (for use inside transactions)
 */
export async function generateBookingId(tx?: any): Promise<string> {
  const client = tx || prisma;

  // Get all bookings with the RETINU prefix to find the highest number
  const bookingsWithPrefix = await client.booking.findMany({
    where: {
      id: {
        startsWith: BOOKING_ID_PREFIX,
      },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  let nextNumber = 1;

  if (bookingsWithPrefix.length > 0) {
    // Extract numbers from all matching booking IDs and find the maximum
    const numbers: number[] = bookingsWithPrefix
      .map((booking: { id: string }) => {
        const numberPart = booking.id.replace(BOOKING_ID_PREFIX, "");
        return parseInt(numberPart, 10);
      })
      .filter((num: number) => !isNaN(num));

    if (numbers.length > 0) {
      const maxNumber = Math.max(...numbers);
      nextNumber = maxNumber + 1;
    }
  }

  // Format number with leading zeros
  const paddedNumber = nextNumber.toString().padStart(ID_LENGTH, "0");

  const newId = `${BOOKING_ID_PREFIX}${paddedNumber}`;

  // Double-check uniqueness (in case of race condition)
  const existing = await client.booking.findUnique({
    where: { id: newId },
    select: { id: true },
  });

  if (existing) {
    // If ID exists, increment and try again
    nextNumber++;
    const retryPaddedNumber = nextNumber.toString().padStart(ID_LENGTH, "0");
    return `${BOOKING_ID_PREFIX}${retryPaddedNumber}`;
  }

  return newId;
}

/**
 * Validate booking ID format
 */
export function isValidBookingId(id: string): boolean {
  if (!id.startsWith(BOOKING_ID_PREFIX)) {
    return false;
  }

  const numberPart = id.replace(BOOKING_ID_PREFIX, "");
  return /^\d+$/.test(numberPart) && numberPart.length <= ID_LENGTH;
}

/** Alphanumeric chars for short reference (exclude 0/O, 1/I/L for readability) */
const REF_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REF_LENGTH = 8;

/**
 * Generate a short, unique booking reference for "view my booking" (e.g. ABC12XY7).
 * @param tx - Optional transaction client (for use inside transactions)
 */
export async function generateBookingReference(tx?: any): Promise<string> {
  const client = tx || prisma;
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    let ref = "";
    for (let i = 0; i < REF_LENGTH; i++) {
      ref += REF_CHARS.charAt(Math.floor(Math.random() * REF_CHARS.length));
    }
    const existing = await client.booking.findUnique({
      where: { bookingReference: ref },
      select: { id: true },
    });
    if (!existing) return ref;
    attempts++;
  }
  // Fallback: timestamp-based to avoid infinite loop
  return (
    REF_CHARS.charAt(Math.floor(Math.random() * REF_CHARS.length)) +
    Date.now().toString(36).toUpperCase().slice(-7)
  );
}

/**
 * Generate next Bill Number
 * Format: RETINUE-100, RETINUE-101, etc.
 * @param tx - Optional transaction client (for use inside transactions)
 */
export async function generateBillNumber(tx?: any): Promise<string> {
  const client = tx || prisma;
  const BILL_PREFIX = "RETINUE-";

  // Get all bookings with the RETINUE- prefix in billNumber
  const lastBill = await client.booking.findFirst({
    where: {
      billNumber: {
        startsWith: BILL_PREFIX,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: { billNumber: true },
  });

  let nextNumber = 100; // Default start

  if (lastBill && lastBill.billNumber) {
    const numberPart = lastBill.billNumber.replace(BILL_PREFIX, "");
    const num = parseInt(numberPart, 10);
    if (!isNaN(num)) {
      nextNumber = num + 1;
    }
  }

  // Double check uniqueness
  let attempts = 0;
  while (attempts < 5) {
    const candidate = `${BILL_PREFIX}${nextNumber}`;
    const existing = await client.booking.findUnique({
      where: { billNumber: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;

    nextNumber++;
    attempts++;
  }

  return `${BILL_PREFIX}${nextNumber}`;
}
