# 🔧 Supabase Connection Fix Guide

## Issue: "Can't reach database server"

This error usually means one of these:

### 1. Database is Paused (Most Common - Free Tier)

Supabase free tier databases pause after 1 week of inactivity.

**Fix:**
1. Go to your Supabase Dashboard
2. Your project should show "Paused" status
3. Click "Restore" or "Resume" to wake it up
4. Wait 1-2 minutes for it to start
5. Try your app again

### 2. IP Restrictions / Connection Pooling

Supabase uses connection pooling. Make sure you're using the correct connection string.

**Check your connection string:**
- Go to Supabase Dashboard → Settings → Database
- Look for "Connection string" section
- Use the "Session mode" connection string (not Transaction mode)
- It should look like:
  ```
  postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require
  ```

### 3. Update Connection String Format

For Vercel/serverless, you might need to use the **Connection Pooler**:

1. Go to Supabase Dashboard → Settings → Database
2. Scroll to "Connection Pooling"
3. Copy the connection string from "Session mode"
4. It will look like:
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-xxx.pooler.supabase.com:6543/postgres?sslmode=require
   ```
5. Notice: It uses port **6543** (pooler) instead of 5432
6. Update `DATABASE_URL` in Vercel with this connection string

### 4. Check Supabase Project Status

1. Go to Supabase Dashboard
2. Check if your project is:
   - ✅ Active (green)
   - ⏸️ Paused (needs to be resumed)
   - ❌ Deleted (need to create new project)

### 5. Test Connection Locally First

Test if the connection works locally:

```bash
# Set environment variable
$env:DATABASE_URL="your_connection_string"

# Test with Prisma
npx prisma db push
```

If it works locally but not on Vercel:
- Check Vercel environment variables
- Make sure you redeployed after adding DATABASE_URL
- Verify the connection string is exactly the same

## Quick Fix Steps

1. **Resume Supabase database** (if paused)
2. **Get fresh connection string** from Supabase dashboard
3. **Update Vercel** environment variable with new connection string
4. **Redeploy** your Vercel project
5. **Test** at `https://retinue.vercel.app/api/health`

## Connection String Template

For Supabase, use this format:
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

Or with Connection Pooler (recommended for serverless):
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

**Important:** 
- Replace `[PASSWORD]` with your actual password (URL-encoded if it has special chars)
- Replace `[PROJECT-REF]` with your project reference
- Replace `[REGION]` with your region (e.g., `us-east-1`)

## Still Not Working?

1. Check Supabase logs: Dashboard → Logs → Database
2. Verify database is running: Dashboard → Database → Check status
3. Try creating a new Supabase project and use that connection string
4. Or switch to Neon (easier for serverless): https://neon.tech
