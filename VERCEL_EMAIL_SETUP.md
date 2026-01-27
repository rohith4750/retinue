# 📧 Vercel Environment Variables - Email Setup

## Required Environment Variables for Forgot Password

Add these environment variables in your Vercel project settings:

---

## 🔐 Step-by-Step Instructions

### 1. Go to Vercel Dashboard

1. Navigate to your project in [Vercel Dashboard](https://vercel.com)
2. Go to **Settings** → **Environment Variables**

### 2. Add Email Configuration Variables

Click **"Add New"** for each variable below:

---

## 📝 Environment Variables to Add

### Required Variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-official-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-official-email@gmail.com
```

---

## 🔍 Detailed Configuration

### 1. SMTP_HOST
```
Variable Name: SMTP_HOST
Value: smtp.gmail.com
Environments: Production, Preview, Development
```

**For different providers:**
- Gmail: `smtp.gmail.com`
- Outlook: `smtp-mail.outlook.com`
- SendGrid: `smtp.sendgrid.net`
- Custom: Your SMTP server address

---

### 2. SMTP_PORT
```
Variable Name: SMTP_PORT
Value: 587
Environments: Production, Preview, Development
```

**Common ports:**
- `587` - Standard SMTP (TLS)
- `465` - SSL SMTP
- `25` - Legacy (not recommended)

---

### 3. SMTP_USER
```
Variable Name: SMTP_USER
Value: your-official-email@gmail.com
Environments: Production, Preview, Development
```

**Important:**
- This is your **official email address**
- For Gmail, use your full email address
- For SendGrid, use `apikey`

---

### 4. SMTP_PASS
```
Variable Name: SMTP_PASS
Value: xxxx xxxx xxxx xxxx
Environments: Production, Preview, Development
```

**For Gmail:**
- Generate an **App Password** (not your regular password)
- Go to: Google Account → Security → App passwords
- Select "Mail" and generate password
- Use the 16-character password (spaces are fine)

**For SendGrid:**
- Use your SendGrid API key

---

### 5. SMTP_FROM
```
Variable Name: SMTP_FROM
Value: your-official-email@gmail.com
Environments: Production, Preview, Development
```

**Important:**
- This is where emails will be sent **FROM**
- Should be your **official email address**
- For Gmail, must match `SMTP_USER`
- This is what users will see as the sender

---

## 📋 Complete Example (Gmail)

Here's a complete example for Gmail:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `SMTP_HOST` | `smtp.gmail.com` | Production, Preview, Development |
| `SMTP_PORT` | `587` | Production, Preview, Development |
| `SMTP_USER` | `info@yourcompany.com` | Production, Preview, Development |
| `SMTP_PASS` | `abcd efgh ijkl mnop` | Production, Preview, Development |
| `SMTP_FROM` | `info@yourcompany.com` | Production, Preview, Development |

---

## 📋 Complete Example (SendGrid)

For production, SendGrid is recommended:

| Variable Name | Value | Environments |
|--------------|-------|--------------|
| `SMTP_HOST` | `smtp.sendgrid.net` | Production, Preview, Development |
| `SMTP_PORT` | `587` | Production, Preview, Development |
| `SMTP_USER` | `apikey` | Production, Preview, Development |
| `SMTP_PASS` | `SG.xxxxxxxxxxxxx` | Production, Preview, Development |
| `SMTP_FROM` | `info@yourcompany.com` | Production, Preview, Development |

---

## ✅ Verification Checklist

After adding variables:

- [ ] `SMTP_HOST` added
- [ ] `SMTP_PORT` added
- [ ] `SMTP_USER` added (your official email)
- [ ] `SMTP_PASS` added (app password for Gmail)
- [ ] `SMTP_FROM` added (same as SMTP_USER for Gmail)
- [ ] All variables added to **Production** environment
- [ ] All variables added to **Preview** environment (optional)
- [ ] All variables added to **Development** environment (optional)
- [ ] Application **redeployed** after adding variables

---

## 🚀 After Adding Variables

### 1. Redeploy Your Application

**Option A: Via Dashboard**
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Select **"Use existing Build Cache"** (optional)
4. Click **"Redeploy"**

**Option B: Via Git Push**
```bash
git commit --allow-empty -m "Trigger redeploy for email config"
git push
```

### 2. Test the Feature

1. Visit your Vercel deployment URL
2. Go to `/login`
3. Click "Forgot password?"
4. Enter a user's email
5. Check the email inbox for the 6-digit code

---

## 🔒 Security Notes

1. **Never commit** these variables to Git
2. **Use App Passwords** for Gmail (not regular passwords)
3. **Different values** for different environments (optional but recommended)
4. **Rotate passwords** periodically
5. **Restrict access** to Vercel project settings

---

## 🐛 Troubleshooting

### Issue: "Email not configured" error

**Solution:**
- Verify all 5 variables are added
- Check variable names are exact (case-sensitive)
- Ensure variables are added to the correct environment
- Redeploy after adding variables

### Issue: "Authentication failed"

**Possible causes:**
- Wrong `SMTP_PASS` (use app password for Gmail)
- 2FA not enabled (required for Gmail app passwords)
- Wrong `SMTP_USER` or `SMTP_HOST`

**Solution:**
- Generate a new Gmail app password
- Verify `SMTP_USER` matches your email
- Check `SMTP_HOST` is correct for your provider

### Issue: Emails not sending

**Check:**
1. All variables are set correctly
2. App password is valid (Gmail)
3. SMTP server is accessible
4. Check Vercel function logs for errors

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [SendGrid Setup Guide](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)

---

## 💡 Quick Copy-Paste

For Gmail, copy these exact variable names:

```
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

Then fill in your values in Vercel dashboard.

---

*Last Updated: January 2026*
