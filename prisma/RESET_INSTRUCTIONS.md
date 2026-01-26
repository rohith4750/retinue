# Database Reset Instructions (No psql Required)

Since `psql` is not in your PATH, here are alternative methods:

## Method 1: Using pgAdmin (GUI - Easiest)

1. **Open pgAdmin** (PostgreSQL GUI tool)
2. **Connect to your server** (localhost:5432)
3. **Right-click on `hotel_management` database** → **Query Tool**
4. **Copy and paste** the entire contents of `prisma/reset-database.sql`
5. **Click Execute** (or press F5)
6. **Then run in terminal**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## Method 2: Using DBeaver (Free Database Tool)

1. **Download DBeaver** from https://dbeaver.io/ (if not installed)
2. **Create new PostgreSQL connection**:
   - Host: `localhost`
   - Port: `5432`
   - Database: `hotel_management`
   - Username: `postgres`
   - Password: `rohith1234`
3. **Open SQL Editor** (Ctrl+`)
4. **Copy and paste** contents of `prisma/reset-database.sql`
5. **Execute** (Ctrl+Enter)
6. **Then run in terminal**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## Method 3: Find psql Full Path

If PostgreSQL is installed, find psql and use full path:

**Windows (common locations):**
```powershell
# Try these paths:
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d hotel_management -f prisma/reset-database.sql

# Or version 14:
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -d hotel_management -f prisma/reset-database.sql

# Or version 16:
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d hotel_management -f prisma/reset-database.sql
```

**Find your PostgreSQL installation:**
```powershell
Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" | Select-Object FullName
```

## Method 4: Add PostgreSQL to PATH (Permanent Solution)

1. **Find PostgreSQL bin folder** (usually `C:\Program Files\PostgreSQL\15\bin`)
2. **Add to PATH**:
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" → Edit
   - Click "New" → Add PostgreSQL bin path
   - Click OK on all dialogs
3. **Restart terminal** and try `psql` command again

## Method 5: Use Prisma Studio (Check Data First)

1. **Open Prisma Studio** to see what's in the database:
   ```bash
   npm run db:studio
   ```

2. **Manually delete** any records that might be causing issues

3. **Then try**:
   ```bash
   npm run db:push -- --force-reset
   npm run db:seed
   ```

## Method 6: Drop and Recreate Database (Nuclear Option)

If you have pgAdmin or another GUI:

1. **Right-click `hotel_management` database** → **Delete/Drop**
2. **Create new database** named `hotel_management`
3. **Then run**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

## Recommended: Method 1 (pgAdmin)

If you have pgAdmin installed (comes with PostgreSQL), use Method 1 - it's the easiest!
