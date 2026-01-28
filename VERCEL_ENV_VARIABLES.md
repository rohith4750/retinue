# 🔐 Vercel Environment Variables Setup

This guide lists all environment variables that need to be configured in Vercel for the Hotel Management System.

## 📋 Required Environment Variables

### 1. **Database Connection** (Required)
```
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
```
- **Description**: PostgreSQL connection string
- **Required**: ✅ Yes
- **Example**: `postgresql://postgres:password@db.xyz.supabase.co:5432/postgres?schema=public`
- **Note**: Use your Supabase or PostgreSQL database connection string

---

### 2. **JWT Authentication** (Required for new JWT system)
```
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
```
- **Description**: Secret keys for JWT token signing
- **Required**: ✅ Yes (for JWT authentication)
- **Security**: 🔒 **CRITICAL** - Use strong, random strings
- **How to generate**:
  ```bash
  # Generate random secrets (use these commands)
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  # Run twice to get two different secrets
  ```

**Recommended values:**
- `JWT_SECRET`: 64+ character random string
- `JWT_REFRESH_SECRET`: Different 64+ character random string

---

### 3. **Token Expiry Settings** (Optional - has defaults)
```
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
```
- **Description**: Token expiration times (session timeout)
- **Required**: ❌ No (defaults: **1 hour** for access, 7 days for refresh)
- **Format**: 
  - `15m` = 15 minutes
  - `1h` = 1 hour (default for session)
  - `7d` = 7 days
  - `30d` = 30 days

**Note:** Session timeout is now **1 hour** by default. Users stay logged in for 1 hour without activity.

---

### 4. **Email Configuration** (Required for Forgot Password)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-official-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-official-email@gmail.com
```
- **Description**: SMTP configuration for sending password reset emails
- **Required**: ✅ Yes (for forgot password feature)
- **Security**: 🔒 Use app passwords for Gmail (not regular password)

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate App Password: Google Account → Security → App passwords
3. Use the app password as `SMTP_PASS`

**Important:**
- `SMTP_FROM` = Your **official email address** (where emails come FROM)
- `SMTP_USER` = Same email (or account with SMTP access)
- For Gmail, both should be the same email address

**Other Providers:**
- **SendGrid**: `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`, `SMTP_PASS=your-api-key`
- **Outlook**: `SMTP_HOST=smtp-mail.outlook.com`, `SMTP_PORT=587`

---

### 5. **Environment Type** (Optional)
```
NODE_ENV=production
```
- **Description**: Environment type
- **Required**: ❌ No (Vercel sets this automatically)
- **Values**: `production`, `development`, `preview`

---

## 🚀 How to Add Environment Variables in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to your project** in Vercel Dashboard
2. **Navigate to**: Settings → Environment Variables
3. **Add each variable**:
   - Click "Add New"
   - Enter variable name (e.g., `JWT_SECRET`)
   - Enter variable value
   - Select environments (Production, Preview, Development)
   - Click "Save"

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
vercel env add ACCESS_TOKEN_EXPIRY
vercel env add REFRESH_TOKEN_EXPIRY
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add SMTP_FROM

# Pull environment variables (for local development)
vercel env pull .env.local
```

---

## 📝 Complete Environment Variables List

Copy this list and add to Vercel:

```env
# Database
DATABASE_URL=your-database-connection-string

# JWT Authentication (REQUIRED)
JWT_SECRET=your-64-character-random-secret-key
JWT_REFRESH_SECRET=your-different-64-character-random-secret-key

# Token Expiry (Optional - has defaults)
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# Email Configuration (REQUIRED for Forgot Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-official-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-official-email@gmail.com

# Environment (Optional - Vercel sets automatically)
NODE_ENV=production
```

---

## 🔒 Security Best Practices

### 1. **Never commit secrets to Git**
- ✅ Use Vercel Environment Variables
- ✅ Use `.env.local` for local development (gitignored)
- ❌ Never commit `.env` files

### 2. **Use different secrets for each environment**
- Production: Strong, unique secrets
- Preview: Different secrets (for testing)
- Development: Different secrets (for local)

### 3. **Rotate secrets regularly**
- Change `JWT_SECRET` and `JWT_REFRESH_SECRET` periodically
- When rotating, users will need to re-login

### 4. **Secret strength**
- Minimum 32 characters
- Recommended: 64+ characters
- Use cryptographically random strings
- Mix of letters, numbers, and special characters

---

## ✅ Verification Checklist

After adding environment variables in Vercel:

- [ ] `DATABASE_URL` is set and correct
- [ ] `JWT_SECRET` is set (64+ characters)
- [ ] `JWT_REFRESH_SECRET` is set (different from JWT_SECRET)
- [ ] `ACCESS_TOKEN_EXPIRY` is set (or using default)
- [ ] `REFRESH_TOKEN_EXPIRY` is set (or using default)
- [ ] `SMTP_HOST` is set (e.g., smtp.gmail.com)
- [ ] `SMTP_PORT` is set (e.g., 587)
- [ ] `SMTP_USER` is set (your official email)
- [ ] `SMTP_PASS` is set (app password for Gmail)
- [ ] `SMTP_FROM` is set (same as SMTP_USER for Gmail)
- [ ] Variables are added to Production environment
- [ ] Variables are added to Preview environment (if needed)
- [ ] Redeployed the application after adding variables

---

### 7. **Database Analytics Password** (Recommended)
```
DB_ANALYTICS_PASSWORD=YourSecurePassword123!
```
- **Description**: Password to access DB Analytics page (SUPER_ADMIN only)
- **Required**: ❌ No (defaults to `SuperAdmin@DB2026`)
- **Security**: 🔒 **Recommended** - Change from default for production

---

### 8. **Auto-Cleanup Cron Secret** (Required for auto-cleanup)
```
CRON_SECRET=your-auto-cleanup-secret-key
```
- **Description**: Secret key for authenticating scheduled cleanup jobs
- **Required**: ✅ Yes (for automatic data cleanup)
- **Security**: 🔒 **CRITICAL** - Use strong, random string
- **Default**: `auto-cleanup-secret-2026`
- **Used by**: Vercel Cron Jobs or external cron services

**For Vercel Cron Jobs:**
The `vercel.json` is pre-configured to run cleanup every 2 months:
```json
{
  "crons": [
    {
      "path": "/api/admin/auto-cleanup?secret=${CRON_SECRET}",
      "schedule": "0 2 1 */2 *"
    }
  ]
}
```

**For External Cron Services (cron-job.org, EasyCron):**
- URL: `https://your-domain.vercel.app/api/admin/auto-cleanup?secret=YOUR_CRON_SECRET`
- Schedule: Every 2 months (1st day at 2:00 AM)
- Cron expression: `0 2 1 */2 *`

---

### 9. **Admin Backup Email** (Recommended for auto-cleanup)
```
ADMIN_BACKUP_EMAIL=admin@yourhotel.com
```
- **Description**: Email address to receive CSV backup files before data cleanup
- **Required**: ❌ No (defaults to `SMTP_USER` if not set)
- **Format**: Valid email address
- **Note**: Before any data is deleted, CSV backup files are automatically emailed to this address

**What you receive:**
- `booking_history_backup_YYYY-MM-DD.csv`
- `inventory_transactions_backup_YYYY-MM-DD.csv`
- `attendance_backup_YYYY-MM-DD.csv`
- `password_resets_backup_YYYY-MM-DD.csv`

---

## 🔄 After Adding Variables

1. **Redeploy your application**:
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Or push a new commit to trigger deployment

2. **Verify the deployment**:
   - Check deployment logs for errors
   - Test login functionality
   - Verify JWT tokens are being generated

3. **Test authentication**:
   - Try logging in
   - Check browser console for errors
   - Verify tokens are stored in localStorage

---

## 🐛 Troubleshooting

### Issue: "JWT_SECRET is not defined"
**Solution**: 
- Ensure `JWT_SECRET` is added in Vercel
- Redeploy after adding the variable
- Check variable name spelling (case-sensitive)

### Issue: "Database connection failed"
**Solution**:
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Ensure database is running and accessible

### Issue: "Invalid token" errors
**Solution**:
- Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Ensure secrets are the same across all environments
- Check token expiry settings

### Issue: Environment variables not updating
**Solution**:
- Redeploy the application after adding variables
- Clear Vercel build cache
- Check variable is added to correct environment (Production/Preview)

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Prisma Connection Strings](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

## 🔐 Quick Setup Script

For local development, create `.env.local`:

```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local with your values
# Then run:
vercel env pull .env.local
```

---

**Last Updated**: After JWT implementation
**Status**: ✅ Ready for Vercel deployment
