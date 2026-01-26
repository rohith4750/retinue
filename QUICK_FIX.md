# 🚀 Quick Database Fix

Since `psql` is not available, use this Node.js script instead!

## Step 1: Reset Database Schema

```bash
npm run db:reset-sql
```

This will drop all tables and enums, clearing the schema mismatch.

## Step 2: Push New Schema

```bash
npm run db:push
```

This creates all tables with the correct schema.

## Step 3: Seed Initial Data

```bash
npm run db:seed
```

This creates the admin user and sample data.

## All-in-One Command

```bash
npm run db:reset-sql && npm run db:push && npm run db:seed
```

---

## Troubleshooting Permission Errors

If you get `EPERM` errors when running `db:push`:

### Option 1: Run as Administrator
1. **Close current terminal**
2. **Right-click PowerShell/CMD** → **Run as Administrator**
3. **Navigate to project**: `cd D:\WORKKKKK\thought`
4. **Run**: `npm run db:push`

### Option 2: Use GUI Tool (pgAdmin/DBeaver)
1. Open pgAdmin or DBeaver
2. Connect to `hotel_management` database
3. The schema should already be created (tables were dropped)
4. Run: `npm run db:push` (might work now)
5. If still fails, manually create schema using Prisma Studio or GUI

### Option 3: Check Antivirus
- Your antivirus might be blocking Prisma executables
- Add `node_modules/@prisma/engines/` to antivirus exclusions

### Option 4: Use Prisma Migrate Instead
```bash
npm run db:migrate
# Name it: "init"
```

See `prisma/RESET_INSTRUCTIONS.md` for detailed GUI instructions.
