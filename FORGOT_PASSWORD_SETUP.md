# 🔐 Forgot Password Feature - Setup Guide

## Overview

The forgot password feature allows users to reset their password using a 6-digit code sent to their email address.

## Features

✅ **6-digit code verification**
✅ **Email-based password reset**
✅ **10-minute code expiration**
✅ **Secure code generation**
✅ **User-friendly UI on login page**

---

## 📋 Prerequisites

### 1. Install Dependencies

```bash
npm install nodemailer @types/nodemailer
```

### 2. Database Migration

The `PasswordReset` model has been added to the Prisma schema. Run:

```bash
npm run db:push
# or
npm run db:migrate
```

---

## ⚙️ Email Configuration

### Environment Variables

Add these to your `.env.local` file (and Vercel environment variables):

```env
# SMTP Configuration (Required for email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-official-email@gmail.com
SMTP_PASS=your-app-password
# Official email address - emails will be sent FROM this address
SMTP_FROM=your-official-email@gmail.com
```

**Important Notes:**
- `SMTP_FROM` is your **official email address** - all password reset emails will be sent FROM this address
- `SMTP_USER` should be the same email (or an account with permission to send from `SMTP_FROM`)
- For Gmail, both `SMTP_USER` and `SMTP_FROM` should be the same email address
- The email address must have permission to send emails via SMTP

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account → Security
   - Under "2-Step Verification", click "App passwords"
   - Generate a new app password for "Mail"
   - Use this password as `SMTP_PASS`

### Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Custom SMTP
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

---

## 🚀 How It Works

### 1. User Flow

1. User clicks **"Forgot password?"** on login page
2. Enters their email address
3. Receives a 6-digit code via email
4. Enters the code and new password
5. Password is reset successfully

### 2. Technical Flow

```
User Request → /api/auth/forgot-password
  ↓
Generate 6-digit code
  ↓
Store in database (expires in 10 minutes)
  ↓
Send email with code
  ↓
User enters code → /api/auth/reset-password
  ↓
Verify code (check expiration & usage)
  ↓
Hash new password
  ↓
Update user password
  ↓
Mark code as used
```

---

## 📁 Files Created/Modified

### New Files
- `lib/email.ts` - Email sending utility
- `lib/password-reset.ts` - Password reset logic
- `app/api/auth/forgot-password/route.ts` - Send reset code endpoint
- `app/api/auth/reset-password/route.ts` - Reset password endpoint

### Modified Files
- `prisma/schema.prisma` - Added `PasswordReset` model
- `app/login/page.tsx` - Added forgot password UI
- `middleware.ts` - Added public routes

---

## 🔒 Security Features

1. **Code Expiration**: Codes expire after 10 minutes
2. **One-time Use**: Codes are marked as used after successful reset
3. **Email Privacy**: Doesn't reveal if email exists in system
4. **Rate Limiting**: Can be added to prevent abuse (see improvements)
5. **Secure Hashing**: Passwords are hashed using bcrypt

---

## 🧪 Testing

### 1. Test Email Configuration

```typescript
// Create a test script: scripts/test-email.ts
import { sendTestEmail, verifyEmailConfig } from '../lib/email'

async function test() {
  const isValid = await verifyEmailConfig()
  console.log('Email config valid:', isValid)
  
  if (isValid) {
    const sent = await sendTestEmail('test@example.com')
    console.log('Test email sent:', sent)
  }
}

test()
```

Run: `tsx scripts/test-email.ts`

### 2. Test Forgot Password Flow

1. Go to login page
2. Click "Forgot password?"
3. Enter a user's email (must have email in database)
4. Check email for 6-digit code
5. Enter code and new password
6. Try logging in with new password

---

## 🐛 Troubleshooting

### Issue: "Email not configured"

**Solution**: Set `SMTP_USER` and `SMTP_PASS` environment variables

### Issue: "Failed to send email"

**Possible causes:**
- Incorrect SMTP credentials
- Gmail requires app password (not regular password)
- Firewall blocking SMTP port
- SMTP server requires authentication

**Solution:**
1. Verify SMTP credentials
2. Check email configuration in `.env.local`
3. Test with `verifyEmailConfig()` function
4. Check server logs for detailed error

### Issue: "Invalid or expired reset code"

**Possible causes:**
- Code expired (10 minutes)
- Code already used
- Wrong code entered

**Solution:**
- Request a new code
- Codes expire after 10 minutes
- Each code can only be used once

### Issue: Email not received

**Check:**
1. Spam/junk folder
2. Email address is correct
3. SMTP configuration is correct
4. Check server logs for email sending errors

---

## 📝 Database Schema

```prisma
model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  code      String   // 6-digit code
  email     String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([email])
  @@index([code])
  @@index([expiresAt])
}
```

---

## 🔄 Maintenance

### Cleanup Expired Codes

Run periodically to clean up old reset codes:

```typescript
import { cleanupExpiredResetCodes } from '@/lib/password-reset'

// Clean up expired codes
const deleted = await cleanupExpiredResetCodes()
console.log(`Cleaned up ${deleted} expired reset codes`)
```

Add to a cron job or scheduled task.

---

## 🎨 UI Features

- **Modal-based interface** - Clean, non-intrusive
- **Two-step process** - Email → Code verification
- **Real-time validation** - Code format, password matching
- **Loading states** - Clear feedback during operations
- **Error handling** - User-friendly error messages

---

## 📚 Next Steps

1. ✅ Set up email configuration
2. ✅ Run database migration
3. ✅ Test the flow
4. ⚠️ Add rate limiting (recommended)
5. ⚠️ Add email templates customization
6. ⚠️ Add logging/monitoring

---

## 🔐 Security Recommendations

1. **Rate Limiting**: Limit password reset requests per IP/email
2. **Email Verification**: Verify email ownership before allowing resets
3. **Password Strength**: Enforce strong password requirements
4. **Audit Logging**: Log all password reset attempts
5. **CAPTCHA**: Add CAPTCHA to prevent automated attacks

---

*Last Updated: January 2026*
