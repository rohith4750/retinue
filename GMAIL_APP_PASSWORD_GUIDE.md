# 🔑 How to Get Gmail App Password - Step by Step

## 📍 Navigation Guide

Follow these exact steps to get your Gmail App Password:

---

## 🚀 Step-by-Step Instructions

### Step 1: Go to Google Account Security

**Option A: Direct Link**
- Click here: [Google Account Security](https://myaccount.google.com/security)

**Option B: Manual Navigation**
1. Open your web browser
2. Go to [google.com](https://www.google.com)
3. Click your **profile picture** (top right corner)
4. Click **"Manage your Google Account"**
5. Click **"Security"** tab (left sidebar)

---

### Step 2: Enable 2-Step Verification

**If 2-Step Verification is NOT enabled:**

1. Scroll down to **"How you sign in to Google"** section
2. Find **"2-Step Verification"**
3. Click **"2-Step Verification"**
4. Click **"Get Started"**
5. Follow the prompts to:
   - Enter your password
   - Add your phone number
   - Verify with a code sent to your phone
   - Turn on 2-Step Verification

**If 2-Step Verification is ALREADY enabled:**
- Skip to Step 3

---

### Step 3: Go to App Passwords

**After 2-Step Verification is enabled:**

1. Still on the **Security** page
2. Scroll to **"How you sign in to Google"** section
3. Find **"2-Step Verification"** (should show "On")
4. Click on **"2-Step Verification"** (not the toggle, click the text/link)
5. Scroll down on the 2-Step Verification page
6. Find **"App passwords"** section
7. Click **"App passwords"**

**Alternative Path:**
- Direct link: [App Passwords](https://myaccount.google.com/apppasswords)
- (You may need to sign in and verify)

---

### Step 4: Generate App Password

1. You'll see a page titled **"App passwords"**
2. Under **"Select app"**, choose: **"Mail"**
3. Under **"Select device"**, choose: **"Other (Custom name)"**
4. Type: **"Vercel"** or **"Hotel Management System"** (any name you want)
5. Click **"Generate"** button

---

### Step 5: Copy the Password

1. Google will show you a **16-character password**
2. It looks like: `abcd efgh ijkl mnop` (with spaces)
   - Or: `abcdefghijklmnop` (without spaces - both work)
3. **Copy this password** (click the copy icon or select and copy)
4. **Important:** You can only see this password once!
5. If you lose it, you'll need to generate a new one

---

### Step 6: Use in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find or create **`SMTP_PASS`** variable
3. Paste the 16-character password you copied
4. Click **"Save"**
5. **Redeploy** your application

---

## 📸 What You'll See

### On Security Page:
```
┌─────────────────────────────────────┐
│ How you sign in to Google           │
├─────────────────────────────────────┤
│ Password                            │
│ 2-Step Verification    [On] ← Click│
│ App passwords                       │
└─────────────────────────────────────┘
```

### On App Passwords Page:
```
┌─────────────────────────────────────┐
│ App passwords                       │
├─────────────────────────────────────┤
│ Select app:                         │
│ [Mail ▼]                           │
│                                     │
│ Select device:                      │
│ [Other (Custom name) ▼]            │
│ Name: [Vercel____________]         │
│                                     │
│ [Generate] ← Click this            │
└─────────────────────────────────────┘
```

### After Generating:
```
┌─────────────────────────────────────┐
│ Your app password                   │
├─────────────────────────────────────┤
│ abcd efgh ijkl mnop                 │
│                                     │
│ [Copy] [Done]                       │
└─────────────────────────────────────┘
```

---

## 🔗 Quick Links

- **Security Page**: https://myaccount.google.com/security
- **App Passwords**: https://myaccount.google.com/apppasswords
- **2-Step Verification**: https://myaccount.google.com/signinoptions/two-step-verification

---

## ⚠️ Important Notes

1. **2-Step Verification Required**: You MUST enable 2-Step Verification first
2. **One-Time View**: You can only see the password once when generated
3. **Spaces Don't Matter**: `abcd efgh ijkl mnop` = `abcdefghijklmnop`
4. **Multiple Passwords**: You can generate multiple app passwords for different apps
5. **Revoke Anytime**: You can delete app passwords from the same page

---

## 🐛 Troubleshooting

### "App passwords" option not showing?

**Possible reasons:**
1. 2-Step Verification is not enabled
   - **Solution**: Enable 2-Step Verification first (Step 2)

2. Using a Google Workspace account
   - **Solution**: Your admin may need to enable app passwords
   - Contact your Google Workspace administrator

3. Account type doesn't support it
   - **Solution**: Use a regular Gmail account or contact Google support

### Can't find "App passwords" link?

**Try this:**
1. Go directly to: https://myaccount.google.com/apppasswords
2. Or search in Google Account: "app passwords"
3. Make sure you're signed in to the correct Google account

### Password not working?

**Check:**
1. Copied the entire 16-character password (no extra spaces)
2. Pasted correctly in Vercel (no line breaks)
3. Generated password for "Mail" app
4. 2-Step Verification is still enabled

---

## ✅ Verification

After adding to Vercel:

1. **Redeploy** your application
2. **Test** forgot password feature
3. **Check** if email is received
4. If not working, check Vercel function logs for errors

---

## 📝 Example

**What you'll copy:**
```
abcd efgh ijkl mnop
```

**What to paste in Vercel:**
```
SMTP_PASS = abcd efgh ijkl mnop
```

**Or without spaces (both work):**
```
SMTP_PASS = abcdefghijklmnop
```

---

## 🎯 Summary

1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification (if not enabled)
3. Click "App passwords" → https://myaccount.google.com/apppasswords
4. Select "Mail" → "Other" → Name it "Vercel"
5. Click "Generate"
6. Copy the 16-character password
7. Paste in Vercel as `SMTP_PASS`
8. Redeploy

---

**That's it!** Your Gmail app password is ready to use.

*Last Updated: January 2026*
