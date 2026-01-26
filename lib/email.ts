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
