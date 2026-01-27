# ⚡ Quick Vercel Email Setup

## 🚀 Add These 5 Variables in Vercel

Go to: **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

### Add Each Variable:

1. **SMTP_HOST**
   - Value: `smtp.gmail.com`
   - Environments: Production, Preview, Development

2. **SMTP_PORT**
   - Value: `587`
   - Environments: Production, Preview, Development

3. **SMTP_USER**
   - Value: `your-official-email@gmail.com` (your actual email)
   - Environments: Production, Preview, Development

4. **SMTP_PASS**
   - Value: `xxxx xxxx xxxx xxxx` (Gmail app password - see below)
   - Environments: Production, Preview, Development

5. **SMTP_FROM**
   - Value: `your-official-email@gmail.com` (same as SMTP_USER)
   - Environments: Production, Preview, Development

---

## 🔑 Get Gmail App Password

### Quick Steps:

1. **Go to**: [Google Account Security](https://myaccount.google.com/security)
   - Or: Google.com → Profile → Manage Google Account → Security tab

2. **Enable 2-Step Verification** (if not enabled):
   - Scroll to "How you sign in to Google"
   - Click "2-Step Verification" → Get Started → Follow prompts

3. **Go to App Passwords**:
   - Click "2-Step Verification" (the link, not toggle)
   - Scroll down → Click "App passwords"
   - Or direct link: [App Passwords](https://myaccount.google.com/apppasswords)

4. **Generate Password**:
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: **"Vercel"**
   - Click **"Generate"**

5. **Copy Password**:
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
   - ⚠️ You can only see it once!

6. **Paste in Vercel**:
   - Go to Vercel → Settings → Environment Variables
   - Add `SMTP_PASS` → Paste the password → Save

**📖 Detailed Guide**: See `GMAIL_APP_PASSWORD_GUIDE.md` for step-by-step with screenshots

---

## ✅ After Adding Variables

1. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment

2. **Test** the forgot password feature:
   - Visit your Vercel URL
   - Go to `/login`
   - Click "Forgot password?"
   - Enter an email and check for the code

---

## 📋 Quick Checklist

- [ ] SMTP_HOST = `smtp.gmail.com`
- [ ] SMTP_PORT = `587`
- [ ] SMTP_USER = Your official email
- [ ] SMTP_PASS = Gmail app password
- [ ] SMTP_FROM = Same as SMTP_USER
- [ ] All added to Production environment
- [ ] Application redeployed

---

**That's it!** Your forgot password emails will now be sent from your official email address.

See `VERCEL_EMAIL_SETUP.md` for detailed instructions.
