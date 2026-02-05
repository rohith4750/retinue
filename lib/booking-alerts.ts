import { prisma } from '@/lib/prisma'
import { sendRoomBookedAlert, sendBookingStepAlert, type RoomBookedAlertDetails, type BookingStepAlertDetails } from '@/lib/email'

const BOOKING_ALERT_EMAILS_ENV = 'BOOKING_ALERT_EMAILS'

/**
 * Get all internal user emails (staff) that should receive room booked alerts.
 * Includes: User.email (where not null) + optional BOOKING_ALERT_EMAILS env (comma-separated).
 */
export async function getInternalAlertEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { email: true },
  })
  const fromDb = users
    .map((u) => u.email)
    .filter((e): e is string => typeof e === 'string' && e.includes('@'))

  const fromEnv = process.env[BOOKING_ALERT_EMAILS_ENV]
  const envEmails = fromEnv
    ? fromEnv.split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'))
    : []

  const combined = new Set([...fromDb, ...envEmails])
  return Array.from(combined)
}

/**
 * Notify all internal users (staff) that a room was booked.
 * Call this after creating a booking (public or staff).
 */
export async function notifyInternalRoomBooked(details: RoomBookedAlertDetails): Promise<void> {
  try {
    const toEmails = await getInternalAlertEmails()
    if (toEmails.length === 0) return
    await sendRoomBookedAlert(toEmails, details)
  } catch (err) {
    console.error('Failed to send room booked alert to internal users:', err)
  }
}

/**
 * Notify all internal users of a booking step (checked in, checked out, cancelled, updated).
 * Call this after any status change or update.
 */
export async function notifyInternalBookingStep(details: BookingStepAlertDetails): Promise<void> {
  try {
    const toEmails = await getInternalAlertEmails()
    if (toEmails.length === 0) return
    await sendBookingStepAlert(toEmails, details)
  } catch (err) {
    console.error('Failed to send booking step alert to internal users:', err)
  }
}
