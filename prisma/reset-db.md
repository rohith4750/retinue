# Database Reset Instructions

If you're getting schema mismatch errors, you have a few options:

## Option 1: Reset Database (Recommended for Development)

This will delete all data and recreate the schema:

```bash
# Reset database (WARNING: Deletes all data)
npm run db:reset

# Then seed with initial data
npm run db:seed
```

## Option 2: Use Migrations (Recommended for Production)

```bash
# Create a new migration
npm run db:migrate

# This will prompt you to name the migration
# Example: "init" or "initial_schema"
```

## Option 3: Force Push (Use with Caution)

If you're sure you want to overwrite the existing schema:

```bash
# Force push schema (may cause data loss)
npx prisma db push --force-reset

# Then seed
npm run db:seed
```

## Option 4: Manual Database Reset (PostgreSQL)

If the above don't work, you can manually reset:

```sql
-- Connect to PostgreSQL and run:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then run:
```bash
npm run db:push
npm run db:seed
```
