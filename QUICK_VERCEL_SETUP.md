# ⚡ Quick Vercel Environment Variables Setup

## 🚀 Quick Steps

### 1. Go to Vercel Dashboard
- Navigate to your project
- Go to **Settings** → **Environment Variables**

### 2. Add These Variables (Copy & Paste)

#### Required Variables:

```env
DATABASE_URL=your-database-connection-string-here
JWT_SECRET=generate-64-char-random-string
JWT_REFRESH_SECRET=generate-different-64-char-random-string
```

#### Optional Variables (with defaults):

```env
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

### 3. Generate Secrets

**Option A: Using Node.js**
```bash
# Run this twice to get two different secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option B: Using OpenSSL**
```bash
# Run this twice to get two different secrets
openssl rand -hex 64
```

**Option C: Online Generator**
- Visit: https://generate-secret.vercel.app/64
- Generate two different secrets

### 4. Add to Vercel

1. Click **"Add New"** for each variable
2. Enter the variable name (e.g., `JWT_SECRET`)
3. Paste the generated value
4. Select environments: **Production**, **Preview**, **Development**
5. Click **"Save"**

### 5. Redeploy

- Go to **Deployments** tab
- Click **"Redeploy"** on the latest deployment
- Or push a new commit

---

## ✅ Checklist

- [ ] `DATABASE_URL` added
- [ ] `JWT_SECRET` added (64+ characters)
- [ ] `JWT_REFRESH_SECRET` added (different from JWT_SECRET)
- [ ] Variables added to Production environment
- [ ] Application redeployed
- [ ] Login tested successfully

---

## 🔍 Verify It Works

After redeploying:
1. Visit your Vercel URL
2. Try logging in
3. Check browser console (F12) for errors
4. Verify tokens are stored in localStorage

---

## 📚 Full Documentation

See `VERCEL_ENV_VARIABLES.md` for detailed information.

---

**Quick Reference:**
- JWT_SECRET: 64+ character random string
- JWT_REFRESH_SECRET: Different 64+ character random string
- Both must be different values!
