# 🚀 Vercel Deployment Guide

## Prerequisites
1. A GitHub account (your code should be pushed to GitHub)
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. A PostgreSQL database (Vercel Postgres, Neon, Supabase, or any PostgreSQL provider)

## Step 1: Set Up PostgreSQL Database

### Option A: Vercel Postgres (Recommended - Easiest)
1. Go to your Vercel dashboard
2. Navigate to **Storage** → **Create Database** → **Postgres**
3. Choose a name and region
4. Copy the connection string (you'll need it later)

### Option B: External PostgreSQL (Neon, Supabase, Railway, etc.)
- **Neon**: https://neon.tech (Free tier available)
- **Supabase**: https://supabase.com (Free tier available)
- **Railway**: https://railway.app (Free tier available)

Get your PostgreSQL connection string from your provider.

## Step 2: Push Code to GitHub

Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 3: Deploy to Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. Click **"Add New..."** → **"Project"**
3. **Import your GitHub repository**:
   - Select your repository (`retinue`)
   - Click **"Import"**
4. **Configure Project Settings**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

5. **Add Environment Variables**:
   Click **"Environment Variables"** and add:

   ```
   # Database (Required)
   DATABASE_URL=your_postgresql_connection_string_here
   
   # JWT Authentication (Required - NEW)
   JWT_SECRET=generate_a_64_character_random_secret_here
   JWT_REFRESH_SECRET=generate_a_different_64_character_random_secret_here
   
   # Token Expiry (Optional - has defaults)
   ACCESS_TOKEN_EXPIRY=15m
   REFRESH_TOKEN_EXPIRY=7d
   
   # NextAuth (if still using)
   NEXTAUTH_SECRET=generate_a_random_secret_here
   NEXTAUTH_URL=https://your-app-name.vercel.app
   ```

   **How to generate secrets:**
   ```bash
   # Generate JWT secrets (run twice for two different secrets)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Or use openssl
   openssl rand -base64 64
   ```
   Or use an online generator: https://generate-secret.vercel.app/64

6. **Click "Deploy"**

### Method 2: Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add Environment Variables**:
   ```bash
   # Required variables
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add JWT_REFRESH_SECRET
   
   # Optional variables
   vercel env add ACCESS_TOKEN_EXPIRY
   vercel env add REFRESH_TOKEN_EXPIRY
   
   # NextAuth (if still using)
   vercel env add NEXTAUTH_SECRET
   vercel env add NEXTAUTH_URL
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

## Step 4: Configure Build Settings

Vercel will automatically detect Next.js, but you may need to add a build script.

### Update package.json (if needed)
Make sure you have:
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

## Step 5: Run Database Migrations

After deployment, you need to run Prisma migrations:

### Option 1: Using Vercel CLI
```bash
# Set up Prisma in production
vercel env pull .env.production
npx prisma migrate deploy
```

### Option 2: Using Vercel Postgres
If using Vercel Postgres, you can run migrations via Vercel dashboard:
1. Go to your project → **Storage** → **Postgres**
2. Use the **SQL Editor** to run migrations manually

### Option 3: Add Build Command
You can add migration to your build process by creating `vercel.json`:

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build"
}
```

## Step 6: Seed Database (Optional)

To seed your database with initial data:

1. **Add a seed script** to your Vercel project:
   - Go to **Settings** → **Functions**
   - Or use Vercel CLI:
   ```bash
   vercel env pull
   npx prisma db seed
   ```

2. **Or manually create admin user**:
   - Access your database directly
   - Create the admin user through your application's UI

## Step 7: Update NEXTAUTH_URL

After deployment, update the `NEXTAUTH_URL` environment variable:
1. Go to **Project Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` to your actual Vercel URL:
   ```
   NEXTAUTH_URL=https://your-project-name.vercel.app
   ```
3. **Redeploy** the project

## Environment Variables Summary

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required Variables

| Variable | Description | Example | How to Generate |
|----------|-------------|---------|-----------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` | From your database provider |
| `JWT_SECRET` | Secret for JWT access tokens | 64+ character random string | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Secret for JWT refresh tokens | Different 64+ character random string | Same as above (run twice) |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ACCESS_TOKEN_EXPIRY` | Access token expiration | `15m` | `15m`, `1h`, `30m` |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiration | `7d` | `7d`, `30d`, `14d` |
| `NEXTAUTH_SECRET` | NextAuth secret (if using) | - | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | NextAuth URL (if using) | - | `https://your-app.vercel.app` |

**⚠️ Important**: `JWT_SECRET` and `JWT_REFRESH_SECRET` must be different values!

## Troubleshooting

### Build Fails
- **Error: Prisma Client not generated**
  - Add `prisma generate` to build command
  - Or add `"postinstall": "prisma generate"` to package.json

### Database Connection Issues
- **Check DATABASE_URL format**: Must include `?sslmode=require` for most cloud databases
- **Check database firewall**: Allow Vercel IPs if using external database
- **Verify credentials**: Make sure username/password are correct

### Migration Issues
- Run migrations manually using Vercel CLI
- Or use Prisma Studio to check database state

### NextAuth Issues
- Make sure `NEXTAUTH_URL` matches your actual domain
- Verify `NEXTAUTH_SECRET` is set and is a strong random string

## Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] **JWT environment variables set** (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
- [ ] Environment variables set correctly
- [ ] Admin user created (if needed)
- [ ] Test login functionality (JWT authentication)
- [ ] Test token refresh functionality
- [ ] Test database operations
- [ ] Check build logs for errors
- [ ] Verify all API routes work
- [ ] Test session timeout (if implemented)

## Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match your custom domain
4. Redeploy

## Monitoring

- Check **Deployments** tab for build logs
- Use **Analytics** to monitor performance
- Check **Functions** tab for serverless function logs

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Prisma + Vercel: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
