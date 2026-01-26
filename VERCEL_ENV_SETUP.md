# 🔐 Vercel Environment Variables - Complete Setup Guide

## ⚡ Quick Setup (Copy & Paste)

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables** and add:

### Required Variables:

```env
DATABASE_URL=your-postgresql-connection-string
JWT_SECRET=your-64-character-random-secret-key
JWT_REFRESH_SECRET=your-different-64-character-random-secret-key
```

### Optional Variables (with defaults):

```env
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

---

## 🔑 Generate Secrets

**Option 1: Node.js**
```bash
# Run TWICE to get two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option 2: OpenSSL**
```bash
# Run TWICE to get two different secrets
openssl rand -hex 64
```

**Option 3: Online Generator**
- Visit: https://generate-secret.vercel.app/64
- Generate two different secrets

---

## 📝 Step-by-Step Instructions

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Environment Variables**

2. **Add Each Variable**
   - Click **"Add New"**
   - Enter variable name (e.g., `JWT_SECRET`)
   - Paste the generated value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **"Save"**

3. **Repeat for All Variables**
   - `DATABASE_URL` (your PostgreSQL connection string)
   - `JWT_SECRET` (first generated secret)
   - `JWT_REFRESH_SECRET` (second generated secret - must be different!)

4. **Redeploy**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on latest deployment

---

## ✅ Verification Checklist

- [ ] `DATABASE_URL` added
- [ ] `JWT_SECRET` added (64+ characters)
- [ ] `JWT_REFRESH_SECRET` added (different from JWT_SECRET)
- [ ] Variables added to **Production** environment
- [ ] Variables added to **Preview** environment (optional)
- [ ] Variables added to **Development** environment (optional)
- [ ] Application redeployed
- [ ] Login tested successfully

---

## 🔒 Security Notes

- ⚠️ **JWT_SECRET** and **JWT_REFRESH_SECRET** must be **different** values
- 🔐 Use **64+ character** random strings
- 🚫 **Never commit** these secrets to Git
- 🔄 Rotate secrets periodically in production

---

## 🐛 Troubleshooting

### Build succeeds but login fails
- Check `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Verify secrets are different values
- Check deployment logs for errors

### "JWT_SECRET is not defined" error
- Ensure variable is added in Vercel
- Redeploy after adding variables
- Check variable name spelling (case-sensitive)

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel
- Ensure database is running

---

## 📚 Full Documentation

See `VERCEL_ENV_VARIABLES.md` for detailed information.

---

**Quick Reference:**
- `JWT_SECRET`: 64+ character random string
- `JWT_REFRESH_SECRET`: Different 64+ character random string
- Both must be different values!
