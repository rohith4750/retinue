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

  // Get the highest existing ID to start with
  // Ordering by ID descending is more reliable than createdAt for sequences
  const lastBooking = await client.booking.findFirst({
    where: {
      id: {
        startsWith: BOOKING_ID_PREFIX,
      },
    },
    select: { id: true },
    orderBy: { id: "desc" },
  });

  let nextNumber = 1;

  if (lastBooking) {
    const numberPart = lastBooking.id.replace(BOOKING_ID_PREFIX, "");
    const lastNum = parseInt(numberPart, 10);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  // Double-check uniqueness with retry loop (handles race conditions and same-transaction batching)
  let attempts = 0;
  while (attempts < 10) {
    const paddedNumber = nextNumber.toString().padStart(ID_LENGTH, "0");
    const newId = `${BOOKING_ID_PREFIX}${paddedNumber}`;

    const existing = await client.booking.findUnique({
      where: { id: newId },
      select: { id: true },
    });

    if (!existing) {
      console.log(`[ID-GEN] Generated unique ID: ${newId}`);
      return newId;
    }

    console.warn(`[ID-GEN] ID collision for ${newId}, retrying...`);
    // If ID exists (possibly from an uncommitted part of same transaction), increment and try again
    nextNumber++;
    attempts++;
  }

  // Final fallback if many collisions (unlikely)
  const fallback = `${BOOKING_ID_PREFIX}${Date.now().toString().slice(-ID_LENGTH)}`;
  console.error(
    `[ID-GEN] ID generation exhausted retries, using fallback: ${fallback}`,
  );
  return fallback;
}

/**
 * Validate booking ID format
 */
export function isValidBookingId(id: string): boolean {
  if (!id.startsWith(BOOKING_ID_PREFIX)) {
    return false;
  }

  const numberPart = id.replace(BOOKING_ID_PREFIX, "");
  return /^\d+$/.test(numberPart) && numberPart.length >= ID_LENGTH;
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
  const maxAttempts = 15;
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
  const BILL_PAD_LENGTH = 5; // e.g., RETINUE-00100

  // Get the highest bill number - order by billNumber itself
  const lastBill = await client.booking.findFirst({
    where: {
      billNumber: {
        startsWith: BILL_PREFIX,
      },
    },
    orderBy: {
      billNumber: "desc",
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
  while (attempts < 15) {
    const candidate = `${BILL_PREFIX}${nextNumber.toString().padStart(BILL_PAD_LENGTH, "0")}`;
    const existing = await client.booking.findFirst({
      where: { billNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      console.log(`[ID-GEN] Generated unique Bill: ${candidate}`);
      return candidate;
    }

    console.warn(
      `[ID-GEN] Bill Number collision for ${candidate}, retrying...`,
    );
    nextNumber++;
    attempts++;
  }

  const fallback = `${BILL_PREFIX}F${Date.now().toString().slice(-4)}`;
  console.error(
    `[ID-GEN] Bill generation exhausted retries, using fallback: ${fallback}`,
  );
  return fallback;
}
