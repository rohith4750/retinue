import { prisma } from '@/lib/prisma'
import { sendRoomBookedAlert, sendBookingStepAlert, type RoomBookedAlertDetails, type BookingStepAlertDetails } from '@/lib/email'

const BOOKING_ALERT_EMAILS_ENV = 'BOOKING_ALERT_EMAILS'

/**
 * Get all internal user IDs that should receive in-app alerts.
 * Currently returns all users with roles SUPER_ADMIN, ADMIN, RECEPTIONIST.
 */
async function getInternalAlertUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'] } },
    select: { id: true },
  })
  return users.map((u) => u.id)
}

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
 * Create in-app notifications for multiple users
 */
async function createInAppNotifications(
  userIds: string[],
  title: string,
  message: string,
  type: string,
  link?: string
) {
  if (userIds.length === 0) return

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      link,
    })),
  })
}

/**
 * Notify all internal users (staff) that a room was booked.
 * Call this after creating a booking (public or staff).
 */
export async function notifyInternalRoomBooked(details: RoomBookedAlertDetails): Promise<void> {
  try {
    // 1. Send Emails
    const toEmails = await getInternalAlertEmails()
    if (toEmails.length > 0) {
      // Don't await email to prevent blocking (fire and forget handled by email lib usually, but here we await. 
      // We can remove await if we want speed, but error logging is good).
      await sendRoomBookedAlert(toEmails, details) // This functions logs its own errors
    }

    // 2. Create In-App Notifications
    const userIds = await getInternalAlertUserIds()
    if (userIds.length > 0) {
      const title = details.isBatch
        ? `New Booking: ${details.rooms?.length} Rooms`
        : `New Booking: Room ${details.roomNumber}`
      
      const message = `${details.guestName} booked ${details.isBatch ? `${details.rooms?.length} rooms` : `Room ${details.roomNumber}`} for ${new Date(details.checkIn).toLocaleDateString('en-IN')}.`
      
      await createInAppNotifications(
        userIds,
        title,
        message,
        'BOOKING',
        `/bookings?search=${details.bookingReference}`
      )
    }
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
    const { step, guestName, roomNumber, bookingReference } = details
    
    // 1. Send Emails
    const toEmails = await getInternalAlertEmails()
    if (toEmails.length > 0) {
      await sendBookingStepAlert(toEmails, details)
    }

    // 2. Create In-App Notifications
    const userIds = await getInternalAlertUserIds()
    if (userIds.length > 0) {
        let title = ''
        let type = 'INFO'
        
        switch (step) {
            case 'CHECKED_IN': title = 'Guest Checked In'; type = 'SUCCESS'; break;
            case 'CHECKED_OUT': title = 'Guest Checked Out'; type = 'INFO'; break;
            case 'CANCELLED': title = 'Booking Cancelled'; type = 'WARNING'; break;
            case 'CONFIRMED': title = 'Booking Confirmed'; type = 'SUCCESS'; break;
            case 'UPDATED': title = 'Booking Updated'; type = 'INFO'; break;
            default: title = 'Booking Update';
        }

        const message = `${title}: ${guestName} (Room ${roomNumber})`

        await createInAppNotifications(
            userIds,
            title,
            message,
            type,
            `/bookings?search=${bookingReference}`
        )
    }
  } catch (err) {
    console.error('Failed to send booking step alert to internal users:', err)
  }
}
