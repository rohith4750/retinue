# 🗄️ Database Setup Guide

## Quick Setup Options

### Option 1: Neon (Recommended - Easiest & Free)

**Why Neon?**
- ✅ Free tier with 0.5 GB storage
- ✅ Easy setup
- ✅ Fast connection
- ✅ Auto-scaling

**Steps:**

1. **Sign up at [neon.tech](https://neon.tech)**
   - Use GitHub to sign in (easiest)

2. **Create a new project**
   - Click "Create Project"
   - Choose a name (e.g., "hotel-management")
   - Select a region closest to you
   - Click "Create Project"

3. **Get your connection string**
   - After project creation, you'll see a connection string like:
     ```
     postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
     ```
   - **Copy this entire string** - you'll need it for Vercel

4. **Test the connection** (optional)
   - You can use the SQL Editor in Neon dashboard to test queries

---

### Option 2: Supabase (Also Great - Free Tier)

**Why Supabase?**
- ✅ Free tier: 500 MB database
- ✅ Built-in dashboard
- ✅ Easy to use

**Steps:**

1. **Sign up at [supabase.com](https://supabase.com)**

2. **Create a new project**
   - Click "New Project"
   - Choose organization
   - Enter project name
   - Set a database password (save it!)
   - Select region
   - Click "Create new project"

3. **Get connection string**
   - Go to **Settings** → **Database**
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string (it will look like):
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with your actual password

---

### Option 3: Vercel Postgres (Integrated with Vercel)

**Why Vercel Postgres?**
- ✅ Integrated directly with Vercel
- ✅ No separate account needed
- ✅ Automatic environment variable setup

**Steps:**

1. **After deploying to Vercel:**
   - Go to your Vercel project dashboard
   - Click **Storage** tab
   - Click **Create Database**
   - Select **Postgres**
   - Choose a name and region
   - Click **Create**

2. **Connection string is automatically set**
   - Vercel will automatically add `POSTGRES_URL` to your environment variables
   - You may need to update your code to use `POSTGRES_URL` instead of `DATABASE_URL`

---

## After Setting Up Database

### Step 1: Update Your Environment Variables

**In Vercel Dashboard:**
1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - **Name**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string (from Neon/Supabase/etc.)
   - **Environment**: Production, Preview, Development (select all)

### Step 2: Run Database Migrations

After deploying to Vercel, you need to set up your database schema:

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Pull environment variables
vercel env pull .env.production

# Run migrations
npx prisma migrate deploy

# Or push schema (if no migrations)
npx prisma db push
```

**Option B: Using Neon/Supabase SQL Editor**

1. Go to your database provider's dashboard
2. Open SQL Editor
3. Run your Prisma schema manually (not recommended for complex schemas)

**Option C: Create a Migration Script**

You can also create a Vercel serverless function to run migrations:

Create `app/api/migrate/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  // Add authentication check here
  try {
    // This is a simple approach - for production, use Prisma Migrate
    // For now, just verify connection
    await prisma.$connect()
    return Response.json({ success: true, message: 'Database connected' })
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}
```

### Step 3: Seed Your Database (Optional)

If you have seed data:

```bash
# Using Vercel CLI
vercel env pull
npx prisma db seed
```

Or create a seed API endpoint similar to migrations.

---

## Connection String Format

Your connection string should look like this:

```
postgresql://username:password@host:port/database?sslmode=require
```

**Important:**
- Always include `?sslmode=require` for cloud databases
- Never commit connection strings to Git
- Use environment variables only

---

## Testing Your Database Connection

### Test Locally:

1. **Update your local `.env` file:**
   ```
   DATABASE_URL="your_connection_string_here"
   ```

2. **Test connection:**
   ```bash
   npx prisma db push
   ```

3. **Or use Prisma Studio:**
   ```bash
   npx prisma studio
   ```

---

## Troubleshooting

### Connection Issues

**Error: "Connection refused"**
- Check if your database is running
- Verify connection string is correct
- Check if IP whitelist is enabled (some providers require this)

**Error: "SSL required"**
- Add `?sslmode=require` to your connection string

**Error: "Authentication failed"**
- Verify username and password
- Check if password has special characters (may need URL encoding)

### Migration Issues

**Error: "Migration failed"**
- Make sure you're using `prisma migrate deploy` (not `prisma migrate dev`)
- Check if database is accessible
- Verify Prisma schema is correct

---

## Recommended Setup Flow

1. ✅ **Set up database** (Neon/Supabase/Vercel Postgres)
2. ✅ **Get connection string**
3. ✅ **Deploy to Vercel** (add DATABASE_URL as env variable)
4. ✅ **Run migrations** using Vercel CLI
5. ✅ **Seed database** (if needed)
6. ✅ **Test your app**

---

## Cost Comparison

| Provider | Free Tier | Paid Plans Start At |
|----------|-----------|---------------------|
| **Neon** | 0.5 GB, shared CPU | $19/month |
| **Supabase** | 500 MB, 2 GB bandwidth | $25/month |
| **Vercel Postgres** | Limited free tier | Pay as you go |
| **Railway** | $5 credit/month | $5/month |

**For development/testing:** Neon or Supabase free tier is perfect!

---

## Next Steps

After setting up your database:
1. ✅ Add `DATABASE_URL` to Vercel environment variables
2. ✅ Run migrations (see Step 2 above)
3. ✅ Test your deployed app
4. ✅ Create admin user (use your `/api/auth/create-users` endpoint)

Need help? Check the main [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) guide!
