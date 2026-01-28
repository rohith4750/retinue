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
