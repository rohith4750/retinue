import nodemailer from "nodemailer";

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
// Official email address - emails will be sent FROM this address
const SMTP_FROM =
  process.env.SMTP_FROM ||
  process.env.OFFICIAL_EMAIL ||
  SMTP_USER ||
  "noreply@theretinue.com";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Constants for branding and localization
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hoteltheretinue.in";
const LOGO_URL = `${APP_URL}/logo-retinue.png`;
const PRIMARY_COLOR = "#f59e0b"; // Amber/Gold
const SECONDARY_COLOR = "#0ea5e9"; // Sky Blue
const BG_DARK = "#0f172a"; // Slate 900
const TIMEZONE = "Asia/Kolkata";

/**
 * Format date and time consistently in IST
 */
function formatDateTime(date: Date | string): string {
  return new Date(date)
    .toLocaleString("en-IN", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "");
}

// Verify email configuration
export async function verifyEmailConfig(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(
      "⚠️ Email configuration missing. SMTP_USER and SMTP_PASS must be set.",
    );
    return false;
  }

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("❌ Email configuration invalid:", error);
    return false;
  }
}

// Send password reset code email
export async function sendPasswordResetCode(
  email: string,
  code: string,
  username: string,
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.error("Email not configured. Cannot send password reset code.");
    return false;
  }

  const fromEmail = SMTP_FROM || SMTP_USER;
  if (!fromEmail) {
    console.error("No sender email configured. Set SMTP_FROM or SMTP_USER.");
    return false;
  }

  const mailOptions = {
    from: `"The Retinue" <${fromEmail}>`,
    to: email,
    subject: "Password Reset Code - The Retinue",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; }
            .header { background-color: ${BG_DARK}; padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0; }
            .logo { width: 240px; height: auto; margin-bottom: 20px; }
            .content { background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .title { color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .subtitle { color: #94a3b8; font-size: 14px; margin-top: 8px; }
            .code-box { background: #fffbeb; border: 2px dashed ${PRIMARY_COLOR}; padding: 24px; border-radius: 12px; margin: 32px 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: ${PRIMARY_COLOR}; text-align: center; }
            .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; padding-bottom: 40px; }
            .button { display: inline-block; padding: 12px 24px; background-color: ${PRIMARY_COLOR}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${LOGO_URL}" alt="The Retinue" class="logo">
            <h1 class="title">Password Reset</h1>
            <p class="subtitle">Hotel The Retinue & Butchiraju Conventions</p>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>We received a request to reset the password for your account. Please use the verification code below to proceed:</p>
            <div class="code-box">${code}</div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">
              This code will expire in <strong>10 minutes</strong>.<br>
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Hotel The Retinue. All rights reserved.</p>
            <p>Visakhapatnam, Andhra Pradesh, India</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${username},
      
      You requested to reset your password for The Retinue.
      Verification code: ${code}
      
      This code will expire in 10 minutes.
      If you didn't request this, please ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

/**
 * Send OTP email for sign-up
 */
export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) return false;
  const fromEmail = SMTP_FROM || SMTP_USER;
  if (!fromEmail) return false;

  const mailOptions = {
    from: `"Hotel The Retinue" <${fromEmail}>`,
    to,
    subject: "Verification Code - Hotel The Retinue",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #1e293b; max-width: 500px; margin: 0 auto; padding: 20px; }
            .container { border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center; }
            .logo { width: 180px; margin-bottom: 24px; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: ${BG_DARK}; margin: 24px 0; background: #f1f5f9; padding: 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <img src="${LOGO_URL}" alt="The Retinue" class="logo">
            <h2>Verify your email</h2>
            <p>Use the following code to complete your registration:</p>
            <div class="code">${code}</div>
            <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
          </div>
        </body>
      </html>
    `,
    text: `Your verification code is: ${code}. Expires in 10 minutes. — Hotel The Retinue`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
}

// Test email configuration
export async function sendTestEmail(to: string): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) return false;
  const fromEmail = SMTP_FROM || SMTP_USER;
  if (!fromEmail) return false;

  const mailOptions = {
    from: `"The Retinue" <${fromEmail}>`,
    to,
    subject: "Test Email - The Retinue",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <img src="${LOGO_URL}" alt="The Retinue" style="width: 200px; margin-bottom: 20px;">
        <h1>Test Connection Successful</h1>
        <p>This is a test email from The Retinue Hotel Management System.</p>
        <p>Time (IST): ${formatDateTime(new Date())}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending test email:", error);
    return false;
  }
}

// Convert JSON data to CSV format
function jsonToCSV(data: any[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "object")
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          if (
            typeof val === "string" &&
            (val.includes(",") || val.includes('"') || val.includes("\n"))
          ) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(","),
    ),
  ];
  return csvRows.join("\n");
}

// Send database backup email
export async function sendDatabaseBackupEmail(
  backupData: {
    bookingHistory?: any[];
    inventoryTransactions?: any[];
    attendance?: any[];
    passwordResets?: any[];
  },
  summary: {
    totalRecords: number;
    cleanedTables: string[];
    timestamp: string;
  },
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_BACKUP_EMAIL || process.env.SMTP_USER;
  if (!adminEmail || !SMTP_USER || !SMTP_PASS) return false;

  const fromEmail = SMTP_FROM || SMTP_USER;
  const attachments: any[] = [];
  const dateStr = new Date().toISOString().split("T")[0];

  if (backupData.bookingHistory?.length) {
    attachments.push({
      filename: `booking_history_${dateStr}.csv`,
      content: jsonToCSV(backupData.bookingHistory),
    });
  }
  if (backupData.inventoryTransactions?.length) {
    attachments.push({
      filename: `inventory_${dateStr}.csv`,
      content: jsonToCSV(backupData.inventoryTransactions),
    });
  }
  if (backupData.attendance?.length) {
    attachments.push({
      filename: `attendance_${dateStr}.csv`,
      content: jsonToCSV(backupData.attendance),
    });
  }
  if (backupData.passwordResets?.length) {
    attachments.push({
      filename: `password_resets_${dateStr}.csv`,
      content: jsonToCSV(backupData.passwordResets),
    });
  }

  const mailOptions = {
    from: `"The Retinue Backup" <${fromEmail}>`,
    to: adminEmail,
    subject: `Database Backup - ${dateStr}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: ${BG_DARK}; padding: 20px; text-align: center;">
          <img src="${LOGO_URL}" alt="The Retinue" style="width: 180px;">
          <h2 style="color: white; margin: 10px 0 0 0;">System Backup</h2>
        </div>
        <div style="padding: 30px;">
          <p>The scheduled database cleanup and backup has completed.</p>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <strong>Cleanup Date:</strong> ${formatDateTime(summary.timestamp)}<br>
            <strong>Records Backed Up:</strong> ${summary.totalRecords}<br>
            <strong>Tables:</strong> ${summary.cleanedTables.join(", ")}
          </div>
          <p style="color: #64748b; font-size: 14px;">CSV files are attached to this email.</p>
        </div>
      </div>
    `,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending backup email:", error);
    return false;
  }
}

export type RoomBookedSourceRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "RECEPTIONIST"
  | "STAFF";

export type RoomBookedAlertDetails = {
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  roomType?: string;
  checkIn: Date;
  checkOut: Date;
  bookingReference: string;
  totalAmount?: number;
  source: "ONLINE" | "STAFF";
  createdByUsername?: string;
  createdByRole?: RoomBookedSourceRole;
  isBatch?: boolean;
  rooms?: Array<{ roomNumber: string; roomType: string }>;
};

function formatSourceLabel(
  source: "ONLINE" | "STAFF",
  username?: string,
  role?: RoomBookedSourceRole,
): string {
  if (source === "ONLINE") return "Customer (Online)";
  if (username && username.trim()) return username.trim();
  if (role) {
    const labels: Record<RoomBookedSourceRole, string> = {
      SUPER_ADMIN: "Super Admin",
      ADMIN: "Admin",
      RECEPTIONIST: "Receptionist",
      STAFF: "Staff",
    };
    return labels[role] ?? role;
  }
  return "Staff";
}

/**
 * Send "Customer room booked" alert
 */
export async function sendRoomBookedAlert(
  toEmails: string[],
  details: RoomBookedAlertDetails,
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS || toEmails.length === 0) return false;
  const fromEmail = SMTP_FROM || SMTP_USER;
  if (!fromEmail) return false;

  const checkInStr = formatDateTime(details.checkIn);
  const checkOutStr = formatDateTime(details.checkOut);
  const sourceLabel = formatSourceLabel(
    details.source,
    details.createdByUsername,
    details.createdByRole,
  );
  const title = details.isBatch
    ? `New Booking: ${details.rooms?.length ?? 0} Rooms`
    : "New Room Booking";
  const roomsList =
    details.isBatch && details.rooms?.length
      ? details.rooms.map((r) => `${r.roomNumber} (${r.roomType})`).join(", ")
      : `${details.roomNumber}${details.roomType ? ` (${details.roomType})` : ""}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 20px; background-color: #f1f5f9; }
          .card { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
          .header { background: ${BG_DARK}; padding: 32px; text-align: center; }
          .logo { width: 220px; height: auto; }
          .status-badge { display: inline-block; padding: 4px 12px; background: #ecfdf5; color: #059669; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 16px; }
          .content { padding: 32px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
          .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .value { font-size: 15px; font-weight: 600; color: #0f172a; }
          .footer { padding: 24px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; }
          .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img src="${LOGO_URL}" alt="The Retinue" class="logo">
            <div class="status-badge">New Notification</div>
            <h1 style="color: white; margin: 16px 0 0 0; font-size: 20px;">${title}</h1>
          </div>
          <div class="content">
            <div style="margin-bottom: 24px;">
              <div class="label">Guest Name</div>
              <div class="value" style="font-size: 18px;">${details.guestName}</div>
              <div class="value" style="font-weight: 400; color: #64748b;">${details.guestPhone}</div>
            </div>
            
            <div class="grid">
              <div>
                <div class="label">Check-in</div>
                <div class="value">${checkInStr}</div>
              </div>
              <div>
                <div class="label">Check-out</div>
                <div class="value">${checkOutStr}</div>
              </div>
              <div>
                <div class="label">Room(s)</div>
                <div class="value">${roomsList}</div>
              </div>
              <div>
                <div class="label">Reference</div>
                <div class="value">#${details.bookingReference}</div>
              </div>
            </div>

            <div class="divider"></div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div class="label">Total Amount</div>
                <div class="value" style="font-size: 20px; color: ${PRIMARY_COLOR};">₹${Number(details.totalAmount || 0).toLocaleString("en-IN")}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Source</div>
                <div class="value">${sourceLabel}</div>
              </div>
            </div>
          </div>
          <div class="footer">
            Automated Alert &bull; Hotel Management System &bull; Visakhapatnam
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Hotel The Retinue" <${fromEmail}>`,
      to: toEmails.join(", "),
      subject: `[New Booking] ${details.guestName} – ${details.bookingReference}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending room booked alert:", error);
    return false;
  }
}

export type BookingStep =
  | "CREATED"
  | "CONFIRMED"
  | "PENDING"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "UPDATED";

export type BookingStepAlertDetails = {
  step: BookingStep;
  bookingReference: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  roomType?: string;
  checkIn: Date;
  checkOut: Date;
  totalAmount?: number;
  performedByUsername?: string;
  source?: "ONLINE" | "STAFF";
};

const STEP_TITLES: Record<BookingStep, string> = {
  CREATED: "Booking Created",
  CONFIRMED: "Booking Confirmed",
  PENDING: "Booking Pending",
  CHECKED_IN: "Guest Checked In",
  CHECKED_OUT: "Guest Checked Out",
  CANCELLED: "Booking Cancelled",
  UPDATED: "Booking Updated",
};

const STEP_COLORS: Record<BookingStep, string> = {
  CREATED: "#3b82f6",
  CONFIRMED: "#10b981",
  PENDING: "#f59e0b",
  CHECKED_IN: "#8b5cf6",
  CHECKED_OUT: "#64748b",
  CANCELLED: "#ef4444",
  UPDATED: "#0ea5e9",
};

/**
 * Send a booking step alert (synced with website data and premium design)
 */
export async function sendBookingStepAlert(
  toEmails: string[],
  details: BookingStepAlertDetails,
): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS || toEmails.length === 0) return false;
  const fromEmail = SMTP_FROM || SMTP_USER;
  if (!fromEmail) return false;

  const title = STEP_TITLES[details.step] ?? details.step;
  const statusColor = STEP_COLORS[details.step] ?? PRIMARY_COLOR;
  const checkInStr = formatDateTime(details.checkIn);
  const checkOutStr = formatDateTime(details.checkOut);
  const roomLine = `${details.roomNumber}${details.roomType ? ` (${details.roomType})` : ""}`;
  const byLine = details.performedByUsername
    ? `Action by: ${details.performedByUsername}`
    : details.source === "ONLINE"
      ? "Source: Customer (Online)"
      : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 20px; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          .header { background: ${BG_DARK}; padding: 40px 20px; text-align: center; }
          .logo { width: 200px; height: auto; margin-bottom: 24px; }
          .step-indicator { display: inline-block; padding: 6px 16px; background: white; color: ${statusColor}; border-radius: 100px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; border: 2px solid ${statusColor}; }
          .content { padding: 40px; }
          .info-box { background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 14px; font-weight: 600; color: #0f172a; }
          .footer { padding: 32px; text-align: center; background: #f8fafc; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          .action-by { font-style: italic; color: #64748b; margin-top: 16px; font-size: 13px; border-left: 3px solid ${statusColor}; padding-left: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${LOGO_URL}" alt="The Retinue" class="logo">
            <br>
            <div class="step-indicator">${title}</div>
          </div>
          <div class="content">
            <h2 style="margin: 0 0 8px 0; color: #0f172a;">${title} Notification</h2>
            <p style="margin: 0; color: #64748b;">Booking Reference: <strong style="color: ${statusColor};">#${details.bookingReference}</strong></p>
            
            <div class="info-box">
              <div style="margin-bottom: 20px;">
                <div class="label">Guest Details</div>
                <div class="value" style="font-size: 18px;">${details.guestName}</div>
                <div class="value" style="font-weight: 400;">${details.guestPhone}</div>
              </div>
              
              <div class="grid">
                <div>
                  <div class="label">Room</div>
                  <div class="value">${roomLine}</div>
                </div>
                <div>
                  <div class="label">Total Amount</div>
                  <div class="value">₹${Number(details.totalAmount || 0).toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div class="label">Check-in</div>
                  <div class="value">${checkInStr}</div>
                </div>
                <div>
                  <div class="label">Check-out</div>
                  <div class="value">${checkOutStr}</div>
                </div>
              </div>
            </div>

            ${byLine ? `<div class="action-by">${byLine}</div>` : ""}
            
            <div style="margin-top: 32px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">Log in to the management system for more details.</p>
              <a href="${APP_URL}" style="display: inline-block; margin-top: 12px; padding: 10px 24px; background: ${BG_DARK}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <strong>Hotel The Retinue & Butchiraju Conventions</strong><br>
            Visakhapatnam, Andhra Pradesh<br>
            &copy; ${new Date().getFullYear()} All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Hotel The Retinue" <${fromEmail}>`,
      to: toEmails.join(", "),
      subject: `[${title}] ${details.guestName} – ${details.bookingReference}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Error sending booking step alert:", error);
    return false;
  }
}
