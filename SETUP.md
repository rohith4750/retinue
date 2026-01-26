# 🚀 Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

The `.env` file should contain:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

## Step 3: Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Create database and tables
npm run db:push

# Seed database with initial data (admin user, sample rooms, etc.)
npm run db:seed
```

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Login

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **Important**: Change the default password after first login in production!

## What's Included in Seed Data

The seed script creates:
- ✅ Admin user (username: `admin`, password: `admin123`)
- ✅ 4 sample rooms (101, 102, 201, 301)
- ✅ Sample inventory items (Bedsheets, Pillows, Toilet Paper, Towels)
- ✅ 3 sample staff members

## Troubleshooting

### Database Issues
If you encounter database errors:
```bash
# Reset database (WARNING: This deletes all data)
rm prisma/dev.db
npm run db:push
npm run db:seed
```

### Port Already in Use
If port 3000 is already in use:
```bash
# Use a different port
npm run dev -- -p 3001
```

### Prisma Client Not Generated
```bash
npm run db:generate
```

## Next Steps

1. ✅ Login with admin credentials
2. ✅ Explore the dashboard
3. ✅ Create more rooms if needed
4. ✅ Create bookings
5. ✅ View and manage bills
6. ✅ Check inventory and staff management

Enjoy your Hotel Management System! 🏨
