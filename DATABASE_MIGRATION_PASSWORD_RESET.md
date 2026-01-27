# 🗄️ Database Migration - Password Reset Table

## Quick SQL Command

Run this SQL query in your database to create the `PasswordReset` table:

```sql
-- Create PasswordReset table
CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");
CREATE INDEX IF NOT EXISTS "PasswordReset_email_idx" ON "PasswordReset"("email");
CREATE INDEX IF NOT EXISTS "PasswordReset_code_idx" ON "PasswordReset"("code");
CREATE INDEX IF NOT EXISTS "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");

-- Add foreign key
ALTER TABLE "PasswordReset" 
ADD CONSTRAINT "PasswordReset_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 📋 Methods to Run

### Method 1: Using Prisma (Recommended)

```bash
npm run db:push
```

This will automatically create the table based on your Prisma schema.

---

### Method 2: Using Prisma Migrate

```bash
npm run db:migrate
```

When prompted, name the migration: `add_password_reset_table`

---

### Method 3: Direct SQL (PostgreSQL)

**Option A: Using psql**
```bash
psql -U your_username -d your_database -f prisma/create-password-reset-table.sql
```

**Option B: Using Supabase SQL Editor**
1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Paste the SQL query above
4. Click **Run**

**Option C: Using Database GUI**
- Open your database client (pgAdmin, DBeaver, etc.)
- Connect to your database
- Run the SQL query

---

### Method 4: Copy SQL File

The complete SQL is saved in: `prisma/create-password-reset-table.sql`

---

## ✅ Verification

After running the migration, verify the table exists:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'PasswordReset';

-- Check table structure
\d "PasswordReset"

-- Or in PostgreSQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'PasswordReset';
```

---

## 🔍 Expected Result

You should see:
- Table `PasswordReset` created
- 4 indexes created
- Foreign key constraint added
- Table linked to `User` table

---

## 🐛 Troubleshooting

### Error: "relation User does not exist"
**Solution**: Make sure the `User` table exists first. Run your existing migrations.

### Error: "duplicate key value"
**Solution**: Table already exists. Use `CREATE TABLE IF NOT EXISTS` or drop it first:
```sql
DROP TABLE IF EXISTS "PasswordReset" CASCADE;
```

### Error: "permission denied"
**Solution**: Make sure you have CREATE TABLE permissions on your database.

---

## 📝 Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (CUID) |
| `userId` | TEXT | Foreign key to User table |
| `code` | TEXT | 6-digit reset code |
| `email` | TEXT | User's email address |
| `expiresAt` | TIMESTAMP | Code expiration time |
| `used` | BOOLEAN | Whether code has been used |
| `createdAt` | TIMESTAMP | Creation timestamp |

---

**That's it!** The table is now ready for the forgot password feature.
