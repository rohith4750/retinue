# OTP sign-up: Email (now) and SMS (after DLT)

Until **Fast2SMS DLT** is approved, use **email** for OTP. After DLT approval, you can use **SMS** (phone).

---

## Use email OTP now (no DLT needed)

**Send OTP:** `POST /api/public/auth/send-otp`  
**Body:** `{ "email": "user@example.com" }`  
**Response:** OTP is sent to that email (via SMTP). `data.channel` = `"email"`.

**Verify OTP:** `POST /api/public/auth/verify-otp`  
**Body:** `{ "email": "user@example.com", "otp": "123456" }`  
**Response:** `signupToken`, `email` (no phone).

**Sign up:** `POST /api/public/auth/signup`  
**Header:** `Authorization: Bearer <signupToken>`  
**Body:** `{ "name": "John", "phone": "9876543210", "address": "..." }` — **phone is required** when token was from email OTP.  
Creates/updates Customer (phone, name, email from token, address).

**Email config:** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (and optionally `SMTP_FROM`) so OTP emails can be sent.

---

## Use SMS OTP after DLT is approved

**Send OTP:** `POST /api/public/auth/send-otp`  
**Body:** `{ "phone": "9876543210" }`  
Sends 6-digit OTP via **Fast2SMS**. Rate limit: 1 per phone per 60 seconds.

**Verify OTP:** `POST /api/public/auth/verify-otp`  
**Body:** `{ "phone": "9876543210", "otp": "123456" }`  
Returns `signupToken`, `phone`.

**Sign up:** `POST /api/public/auth/signup`  
**Body:** `{ "name": "John", "email": "j@example.com", "address": "..." }` — phone comes from token.

---

## Fast2SMS (for when you switch to SMS)

1. Sign up at [Fast2SMS](https://www.fast2sms.com/).
2. Dev API → get **API Key**.
3. For DLT-compliant SMS in India: register **Sender ID** and **OTP template** in the DLT section and get them approved.
4. Set env: `FAST2SMS_API_KEY=your_key`.

---

## Migration for email OTP

If `OtpVerification` already exists, run:

```bash
psql $DATABASE_URL -f prisma/add-otp-email.sql
```

Or run the SQL in your DB client:

```sql
ALTER TABLE "OtpVerification" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "OtpVerification" ALTER COLUMN "phone" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "OtpVerification_email_purpose_idx" ON "OtpVerification"("email", "purpose") WHERE "email" IS NOT NULL;
```

Then run `npx prisma generate`.
