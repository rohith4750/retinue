import nodemailer from 'nodemailer'

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
// Official email address - emails will be sent FROM this address
const SMTP_FROM = process.env.SMTP_FROM || process.env.OFFICIAL_EMAIL || SMTP_USER || 'noreply@theretinue.com'

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ Email configuration missing. SMTP_USER and SMTP_PASS must be set.')
    return false
  }

  try {
    await transporter.verify()
    return true
  } catch (error) {
    console.error('❌ Email configuration invalid:', error)
    return false
  }
}

// Send password reset code email
export async function sendPasswordResetCode(
  email: string,
  code: string,
  username: string
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('Email not configured. Cannot send password reset code.')
    return false
  }

  // Ensure email is sent from the official email address
  const fromEmail = SMTP_FROM || SMTP_USER
  if (!fromEmail) {
    console.error('No sender email configured. Set SMTP_FROM or SMTP_USER.')
    return false
  }

  const mailOptions = {
    from: `"The Retinue" <${fromEmail}>`,
    to: email,
    subject: 'Password Reset Code - The Retinue',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
              padding: 30px;
              border-radius: 10px;
              text-align: center;
            }
            .code-box {
              background: #fff;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #0ea5e9;
              display: inline-block;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: white; margin: 0 0 20px 0;">Password Reset Request</h1>
            <div style="background: white; padding: 30px; border-radius: 8px;">
              <p>Hello <strong>${username}</strong>,</p>
              <p>You requested to reset your password for your The Retinue account.</p>
              <p>Please use the following 6-digit code to reset your password:</p>
              <div class="code-box">${code}</div>
              <p style="color: #666; font-size: 14px;">
                This code will expire in 10 minutes.
              </p>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>The Retinue Hotel Management System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - The Retinue
      
      Hello ${username},
      
      You requested to reset your password. Please use the following code:
      
      ${code}
      
      This code will expire in 10 minutes.
      
      If you didn't request this, please ignore this email.
    `,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return false
  }
}

/**
 * Send OTP email for sign-up (use until Fast2SMS DLT is approved; then switch to SMS).
 */
export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('Email not configured. Cannot send OTP.')
    return false
  }

  const fromEmail = SMTP_FROM || SMTP_USER
  if (!fromEmail) {
    console.error('No sender email configured.')
    return false
  }

  const mailOptions = {
    from: `"Hotel The Retinue" <${fromEmail}>`,
    to,
    subject: 'Your sign-up OTP - Hotel The Retinue',
    html: `
      <p>Your one-time code for sign-up is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p style="color:#666;font-size:14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
      <p>— Hotel The Retinue</p>
    `,
    text: `Your sign-up OTP is: ${code}. Expires in 10 minutes. — Hotel The Retinue`,
  }

  try {
    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending OTP email:', error)
    return false
  }
}

// Test email configuration (for development)
export async function sendTestEmail(to: string): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('Email not configured.')
    return false
  }

  const fromEmail = SMTP_FROM || SMTP_USER
  if (!fromEmail) {
    console.error('No sender email configured.')
    return false
  }

  const mailOptions = {
    from: `"The Retinue" <${fromEmail}>`,
    to,
    subject: 'Test Email - The Retinue',
    text: 'This is a test email from The Retinue Hotel Management System.',
    html: '<p>This is a test email from The Retinue Hotel Management System.</p>',
  }

  try {
    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Error sending test email:', error)
    return false
  }
}

// Convert JSON data to CSV format
function jsonToCSV(data: any[]): string {
  if (!data || data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(',')
    )
  ]
  return csvRows.join('\n')
}

// Send database backup email with CSV attachments
export async function sendDatabaseBackupEmail(
  backupData: {
    bookingHistory?: any[]
    inventoryTransactions?: any[]
    attendance?: any[]
    passwordResets?: any[]
  },
  summary: {
    totalRecords: number
    cleanedTables: string[]
    timestamp: string
  }
): Promise<boolean> {
  // Get admin email from environment or use SMTP_USER
  const adminEmail = process.env.ADMIN_BACKUP_EMAIL || process.env.SMTP_USER
  
  if (!adminEmail || !SMTP_USER || !SMTP_PASS) {
    console.warn('Email not configured for backups. Skipping backup email.')
    return false
  }

  const fromEmail = SMTP_FROM || SMTP_USER
  const attachments: any[] = []
  const dateStr = new Date().toISOString().split('T')[0]

  // Create CSV attachments for each data type
  if (backupData.bookingHistory && backupData.bookingHistory.length > 0) {
    attachments.push({
      filename: `booking_history_backup_${dateStr}.csv`,
      content: jsonToCSV(backupData.bookingHistory),
      contentType: 'text/csv',
    })
  }

  if (backupData.inventoryTransactions && backupData.inventoryTransactions.length > 0) {
    attachments.push({
      filename: `inventory_transactions_backup_${dateStr}.csv`,
      content: jsonToCSV(backupData.inventoryTransactions),
      contentType: 'text/csv',
    })
  }

  if (backupData.attendance && backupData.attendance.length > 0) {
    attachments.push({
      filename: `attendance_backup_${dateStr}.csv`,
      content: jsonToCSV(backupData.attendance),
      contentType: 'text/csv',
    })
  }

  if (backupData.passwordResets && backupData.passwordResets.length > 0) {
    attachments.push({
      filename: `password_resets_backup_${dateStr}.csv`,
      content: jsonToCSV(backupData.passwordResets),
      contentType: 'text/csv',
    })
  }

  const mailOptions = {
    from: `"The Retinue Backup" <${fromEmail}>`,
    to: adminEmail,
    subject: `Database Cleanup Backup - ${dateStr} - The Retinue`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 10px; }
            .content { background: white; padding: 30px; border-radius: 8px; }
            .stat-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .footer { margin-top: 20px; font-size: 12px; color: rgba(255,255,255,0.8); text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: white; margin: 0 0 20px 0; text-align: center;">📦 Database Backup</h1>
            <div class="content">
              <h2 style="color: #6366f1; margin-top: 0;">Automatic Cleanup Completed</h2>
              <p>The scheduled database cleanup has completed. Old records have been backed up and removed.</p>
              
              <div class="stat-box">
                <strong>📅 Cleanup Date:</strong> ${new Date(summary.timestamp).toLocaleString('en-IN')}
              </div>
              
              <div class="stat-box">
                <strong>📊 Total Records Backed Up:</strong> ${summary.totalRecords}
              </div>
              
              <div class="stat-box">
                <strong>🗂️ Tables Cleaned:</strong><br/>
                ${summary.cleanedTables.map(t => `• ${t}`).join('<br/>')}
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>⚠️ Important:</strong> CSV backup files are attached to this email. 
                Please save them to your records if needed.
              </div>
              
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                ${attachments.length} CSV file(s) attached to this email.
              </p>
            </div>
            <div class="footer">
              <p>The Retinue Hotel Management System - Automatic Backup</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Database Cleanup Backup - The Retinue

Cleanup Date: ${new Date(summary.timestamp).toLocaleString('en-IN')}
Total Records Backed Up: ${summary.totalRecords}
Tables Cleaned: ${summary.cleanedTables.join(', ')}

${attachments.length} CSV backup file(s) attached.
    `,
    attachments,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Database backup email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending database backup email:', error)
    return false
  }
}

/** Role for display when source is STAFF (not "Staff" generic label) */
export type RoomBookedSourceRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

/** Room booked alert payload for internal staff */
export type RoomBookedAlertDetails = {
  guestName: string
  guestPhone: string
  roomNumber: string
  roomType?: string
  checkIn: Date
  checkOut: Date
  bookingReference: string
  totalAmount?: number
  source: 'ONLINE' | 'STAFF'
  /** When source is STAFF, show this username as source (e.g. who created the booking) */
  createdByUsername?: string
  /** When source is STAFF and no username, fallback to role label */
  createdByRole?: RoomBookedSourceRole
  isBatch?: boolean
  rooms?: Array<{ roomNumber: string; roomType: string }>
}

function formatSourceLabel(
  source: 'ONLINE' | 'STAFF',
  username?: string,
  role?: RoomBookedSourceRole
): string {
  if (source === 'ONLINE') return 'Customer (Online)'
  if (username && username.trim()) return username.trim()
  if (role) {
    const labels: Record<RoomBookedSourceRole, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      RECEPTIONIST: 'Receptionist',
      STAFF: 'Staff',
    }
    return labels[role] ?? role
  }
  return 'Staff'
}

/**
 * Send "Customer room booked" alert to internal staff emails.
 * Used when a room is booked (especially from public/customer side).
 */
export async function sendRoomBookedAlert(
  toEmails: string[],
  details: RoomBookedAlertDetails
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS || toEmails.length === 0) {
    if (toEmails.length === 0) console.warn('No recipient emails for room booked alert.')
    return false
  }

  const fromEmail = SMTP_FROM || SMTP_USER
  if (!fromEmail) return false

  const checkInStr = new Date(details.checkIn).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const checkOutStr = new Date(details.checkOut).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const sourceLabel = formatSourceLabel(details.source, details.createdByUsername, details.createdByRole)
  const title = details.isBatch
    ? `Customer booked ${details.rooms?.length ?? 0} room(s)`
    : 'Customer room booked'

  const roomsList =
    details.isBatch && details.rooms?.length
      ? details.rooms.map((r) => `${r.roomNumber} (${r.roomType})`).join(', ')
      : `${details.roomNumber}${details.roomType ? ` (${details.roomType})` : ''}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 1.25rem;">${title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Hotel The Retinue & Butchiraju Conventions</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px 0;"><strong>Guest:</strong> ${details.guestName}</p>
          <p style="margin: 0 0 12px 0;"><strong>Phone:</strong> ${details.guestPhone}</p>
          <p style="margin: 0 0 12px 0;"><strong>Room(s):</strong> ${roomsList}</p>
          <p style="margin: 0 0 12px 0;"><strong>Check-in:</strong> ${checkInStr}</p>
          <p style="margin: 0 0 12px 0;"><strong>Check-out:</strong> ${checkOutStr}</p>
          <p style="margin: 0 0 12px 0;"><strong>Booking reference:</strong> ${details.bookingReference}</p>
          ${details.totalAmount != null ? `<p style="margin: 0 0 12px 0;"><strong>Total amount:</strong> ₹${Number(details.totalAmount).toLocaleString('en-IN')}</p>` : ''}
          <p style="margin: 0;"><strong>Source:</strong> ${sourceLabel}</p>
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: #64748b;">This is an automated alert from the hotel management system.</p>
      </body>
    </html>
  `

  const text = [
    title,
    `Guest: ${details.guestName}`,
    `Phone: ${details.guestPhone}`,
    `Room(s): ${roomsList}`,
    `Check-in: ${checkInStr}`,
    `Check-out: ${checkOutStr}`,
    `Booking reference: ${details.bookingReference}`,
    details.totalAmount != null ? `Total amount: ₹${Number(details.totalAmount).toLocaleString('en-IN')}` : '',
    `Source: ${sourceLabel}`,
  ].filter(Boolean).join('\n')

  try {
    await transporter.sendMail({
      from: `"Hotel The Retinue" <${fromEmail}>`,
      to: toEmails.join(', '),
      subject: `[Alert] ${title} – ${details.bookingReference}`,
      text,
      html,
    })
    return true
  } catch (error) {
    console.error('Error sending room booked alert:', error)
    return false
  }
}

/** Booking step for internal alerts (every step = one email) */
export type BookingStep =
  | 'CREATED'
  | 'CONFIRMED'
  | 'PENDING'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'UPDATED'

export type BookingStepAlertDetails = {
  step: BookingStep
  bookingReference: string
  guestName: string
  guestPhone: string
  roomNumber: string
  roomType?: string
  checkIn: Date
  checkOut: Date
  totalAmount?: number
  /** Who performed the action (staff username); optional for system/online */
  performedByUsername?: string
  /** For CREATED: source of booking */
  source?: 'ONLINE' | 'STAFF'
}

const STEP_TITLES: Record<BookingStep, string> = {
  CREATED: 'Room booked',
  CONFIRMED: 'Booking confirmed',
  PENDING: 'Booking pending',
  CHECKED_IN: 'Guest checked in',
  CHECKED_OUT: 'Guest checked out',
  CANCELLED: 'Booking cancelled',
  UPDATED: 'Booking updated',
}

/**
 * Send a booking step alert to internal staff (every step = one email).
 */
export async function sendBookingStepAlert(
  toEmails: string[],
  details: BookingStepAlertDetails
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS || toEmails.length === 0) return false

  const fromEmail = SMTP_FROM || SMTP_USER
  if (!fromEmail) return false

  const title = STEP_TITLES[details.step] ?? details.step
  const checkInStr = new Date(details.checkIn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const checkOutStr = new Date(details.checkOut).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  const roomLine = `${details.roomNumber}${details.roomType ? ` (${details.roomType})` : ''}`
  const byLine = details.performedByUsername
    ? `Performed by: ${details.performedByUsername}`
    : details.source === 'ONLINE'
      ? 'Source: Customer (Online)'
      : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 1.25rem;">${title}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Hotel The Retinue & Butchiraju Conventions</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px 0;"><strong>Step:</strong> ${title}</p>
          <p style="margin: 0 0 12px 0;"><strong>Guest:</strong> ${details.guestName}</p>
          <p style="margin: 0 0 12px 0;"><strong>Phone:</strong> ${details.guestPhone}</p>
          <p style="margin: 0 0 12px 0;"><strong>Room:</strong> ${roomLine}</p>
          <p style="margin: 0 0 12px 0;"><strong>Check-in:</strong> ${checkInStr}</p>
          <p style="margin: 0 0 12px 0;"><strong>Check-out:</strong> ${checkOutStr}</p>
          <p style="margin: 0 0 12px 0;"><strong>Booking reference:</strong> ${details.bookingReference}</p>
          ${details.totalAmount != null ? `<p style="margin: 0 0 12px 0;"><strong>Total amount:</strong> ₹${Number(details.totalAmount).toLocaleString('en-IN')}</p>` : ''}
          ${byLine ? `<p style="margin: 0;"><strong>${byLine}</strong></p>` : ''}
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: #64748b;">This is an automated alert from the hotel management system.</p>
      </body>
    </html>
  `

  const text = [
    title,
    `Guest: ${details.guestName}`,
    `Phone: ${details.guestPhone}`,
    `Room: ${roomLine}`,
    `Check-in: ${checkInStr}`,
    `Check-out: ${checkOutStr}`,
    `Booking reference: ${details.bookingReference}`,
    details.totalAmount != null ? `Total amount: ₹${Number(details.totalAmount).toLocaleString('en-IN')}` : '',
    byLine,
  ].filter(Boolean).join('\n')

  try {
    await transporter.sendMail({
      from: `"Hotel The Retinue" <${fromEmail}>`,
      to: toEmails.join(', '),
      subject: `[Alert] ${title} – ${details.bookingReference}`,
      text,
      html,
    })
    return true
  } catch (error) {
    console.error('Error sending booking step alert:', error)
    return false
  }
}
