# Fixing Database Schema Issues

You're encountering a schema mismatch error. Here are solutions:

## Problem
The database has old enum values (OCCUPIED, STANDARD, HOTEL_MANAGER, INVENTORY_MANAGER) that don't exist in the current schema, and Prisma can't sync the schema.

## Solution 1: Manual SQL Reset (Recommended)

1. **Connect to your PostgreSQL database** using pgAdmin, DBeaver, or psql:
   ```bash
   psql -U postgres -d hotel_management
   ```

2. **Run the reset script**:
   ```sql
   -- Copy and paste the contents of prisma/reset-database.sql
   -- Or run it directly:
   \i prisma/reset-database.sql
   ```

3. **Then run Prisma commands**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## Solution 2: Using Prisma Studio

1. **Open Prisma Studio** to check current database state:
   ```bash
   npm run db:studio
   ```

2. **Manually delete problematic records** that use old enum values

3. **Then run**:
   ```bash
   npm run db:push
   ```

## Solution 3: Fix Permission Issues

If you're getting `EPERM` errors:

1. **Run terminal as Administrator**
2. **Check antivirus** - it might be blocking Prisma executables
3. **Try running**:
   ```bash
   npm run db:generate
   npm run db:push -- --skip-generate
   ```

## Solution 4: Fresh Database

If you can create a new database:

1. **Create new database**:
   ```sql
   CREATE DATABASE hotel_management_new;
   ```

2. **Update `.env`**:
   ```
   DATABASE_URL="postgresql://postgres:rohith1234@localhost:5432/hotel_management_new?schema=public"
   ```

3. **Run**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## Quick Fix Command

If you have psql access, run this one-liner:

```bash
psql -U postgres -d hotel_management -f prisma/reset-database.sql
```

Then:
```bash
npm run db:push
npm run db:seed
```
