# ⚡ Forgot Password - Quick Start

## ✅ What's Been Implemented

1. ✅ Database model (`PasswordReset`)
2. ✅ Email utility (`lib/email.ts`)
3. ✅ Password reset logic (`lib/password-reset.ts`)
4. ✅ API endpoints (`/api/auth/forgot-password`, `/api/auth/reset-password`)
5. ✅ Login page UI with forgot password modal

---

## 🚀 Setup Steps

### Step 1: Install Dependencies

```bash
npm install nodemailer @types/nodemailer
```

### Step 2: Update Database

```bash
npm run db:push
```

### Step 3: Configure Email (Add to `.env.local`)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-official-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-official-email@gmail.com
```

**Important:** 
- `SMTP_FROM` should be your **official email address** - this is where emails will be sent FROM
- `SMTP_USER` should be the same email (or the account that has permission to send from `SMTP_FROM`)
- For Gmail, both should be the same email address

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account → Security → App passwords
3. Use the app password as `SMTP_PASS`

### Step 4: Test It!

1. Go to `/login`
2. Click "Forgot password?"
3. Enter email → Get code → Reset password

---

## 📧 Email Providers

### Gmail (Recommended for Dev)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Outlook
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-api-key
```

---

## 🎯 How It Works

1. User clicks "Forgot password?" on login page
2. Enters email → Receives 6-digit code via email
3. Enters code + new password → Password reset!

**Code expires in 10 minutes**

---

## ⚠️ Important Notes

- Users must have an `email` field in the database
- Email configuration is required for the feature to work
- Codes expire after 10 minutes
- Each code can only be used once

---

See `FORGOT_PASSWORD_SETUP.md` for detailed documentation.
