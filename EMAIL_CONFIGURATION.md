# 📧 Email Configuration Guide

## Official Email Setup

All password reset emails will be sent **FROM your official email address**.

---

## ⚙️ Configuration

### Environment Variables

Add these to your `.env.local` file:

```env
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Your Official Email Address
SMTP_USER=your-official-email@yourdomain.com
SMTP_PASS=your-app-password

# Sender Email (should be your official email)
SMTP_FROM=your-official-email@yourdomain.com
```

**Key Points:**
- `SMTP_FROM` = Your **official email address** (where emails come FROM)
- `SMTP_USER` = Email account with SMTP access (usually same as `SMTP_FROM`)
- Both should be your official email address

---

## 📧 Gmail Setup (Most Common)

### Step 1: Use Your Official Gmail Account

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-official-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-official-email@gmail.com
```

### Step 2: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"

### Step 3: Generate App Password

1. Go to Google Account → Security
2. Under "2-Step Verification", click **"App passwords"**
3. Select "Mail" and your device
4. Click "Generate"
5. Copy the 16-character password
6. Use this as `SMTP_PASS`

**Note:** The app password is different from your regular Gmail password.

---

## 🏢 Custom Domain Email Setup

If you have a custom domain email (e.g., `info@yourcompany.com`):

### Option 1: Gmail with Custom Domain (Google Workspace)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@yourcompany.com
SMTP_PASS=your-app-password
SMTP_FROM=info@yourcompany.com
```

### Option 2: Custom SMTP Server

```env
SMTP_HOST=mail.yourcompany.com
SMTP_PORT=587
SMTP_USER=info@yourcompany.com
SMTP_PASS=your-email-password
SMTP_FROM=info@yourcompany.com
```

**Check with your email provider for:**
- SMTP server address
- SMTP port (usually 587 or 465)
- Authentication requirements

---

## ✅ Verification

### Test Email Configuration

1. Set up your environment variables
2. Start your development server
3. Try the forgot password flow
4. Check your official email inbox for the reset code

### Verify Sender Address

The email should show:
- **From:** "The Retinue" <your-official-email@yourdomain.com>
- **To:** User's email address
- **Subject:** Password Reset Code - The Retinue

---

## 🔒 Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Separate Account**: Consider using a dedicated email for system emails
3. **Environment Variables**: Never commit email credentials to Git
4. **Vercel Setup**: Add all SMTP variables to Vercel environment variables

---

## 🐛 Troubleshooting

### Issue: "Email not sent from official address"

**Solution:**
- Ensure `SMTP_FROM` is set to your official email
- For Gmail, `SMTP_USER` and `SMTP_FROM` must be the same
- Verify the email account has SMTP sending permissions

### Issue: "Authentication failed"

**Possible causes:**
- Wrong password (use app password for Gmail)
- 2FA not enabled (required for Gmail app passwords)
- Account doesn't allow "Less secure app access" (use app password instead)

**Solution:**
- Generate a new app password
- Ensure 2FA is enabled
- Use app password, not regular password

### Issue: "Emails going to spam"

**Solutions:**
- Use a custom domain email (better deliverability)
- Set up SPF/DKIM records for your domain
- Use a professional email service (SendGrid, Mailgun, etc.)

---

## 📝 Example Configurations

### Gmail (Personal)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=yourname@gmail.com
```

### Google Workspace (Business)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@yourcompany.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=info@yourcompany.com
```

### Outlook/Office 365
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=info@yourcompany.com
SMTP_PASS=your-password
SMTP_FROM=info@yourcompany.com
```

### SendGrid (Recommended for Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=info@yourcompany.com
```

---

## 🚀 Production Recommendations

For production, consider using:

1. **SendGrid** - Reliable, good deliverability
2. **Mailgun** - Developer-friendly
3. **Amazon SES** - Cost-effective at scale
4. **Resend** - Modern, simple API

These services provide:
- Better deliverability
- Email analytics
- Bounce handling
- Professional appearance

---

*Last Updated: January 2026*
