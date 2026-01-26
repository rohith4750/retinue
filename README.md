# 🏨 Hotel Management System

A complete hotel management solution built with Next.js, TypeScript, Prisma, and Tailwind CSS.

## Features

### ✅ Core Features Implemented

1. **Room Management**
   - Create, edit, and delete rooms
   - Room types: Single, Double, Deluxe, Suite
   - Room status tracking (Available, Booked, Maintenance)
   - Floor and capacity management

2. **Room Slot/Availability System**
   - Time-based slot management (Morning, Afternoon, Night, Full Day)
   - Date-based availability tracking
   - Dynamic pricing per slot

3. **Booking System**
   - Complete booking flow with guest details
   - Room and slot selection
   - Check-in/Check-out management
   - Booking status tracking

4. **Auto-Generated Billing**
   - Automatic bill generation on booking
   - GST calculation (18%)
   - Payment tracking (Pending, Partial, Paid)
   - Print/Download invoice

5. **Inventory Management**
   - Item tracking with categories
   - Quantity and unit management
   - Low stock alerts
   - Minimum stock thresholds

6. **Staff Management**
   - Staff member registration
   - Role assignment
   - Salary tracking
   - Status management

7. **Role-Based Authentication**
   - Super Admin (Full access)
   - Admin (Hotel operations)
   - Receptionist (Booking + Billing)
   - Staff (View-only)

8. **Dashboard**
   - Real-time statistics
   - Today's bookings and revenue
   - Pending payments
   - Low stock alerts
   - Recent bookings overview

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (via Prisma)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Authentication**: Custom JWT-based (simplified for demo)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Initialize database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Create initial admin user** (optional)
   
   You can create an admin user by running a script or manually through the database. For now, you'll need to create a user in the database.

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

### Tables

- **Room**: Room master data
- **RoomSlot**: Time-based room availability
- **Guest**: Guest information
- **Booking**: Booking records
- **Bill**: Auto-generated invoices
- **Inventory**: Inventory items
- **InventoryTransaction**: Inventory movement tracking
- **Staff**: Staff member information
- **Attendance**: Staff attendance records
- **User**: Authentication and authorization

## Project Structure

```
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication
│   │   ├── rooms/        # Room management
│   │   ├── bookings/     # Booking operations
│   │   ├── bills/        # Billing
│   │   ├── inventory/    # Inventory management
│   │   ├── staff/        # Staff management
│   │   └── dashboard/    # Dashboard stats
│   ├── bookings/         # Booking page
│   ├── dashboard/        # Dashboard page
│   ├── inventory/        # Inventory page
│   ├── login/           # Login page
│   ├── rooms/           # Room management page
│   ├── staff/           # Staff page
│   └── bills/           # Bill view page
├── components/           # React components
├── lib/                 # Utilities and helpers
│   ├── prisma.ts        # Prisma client
│   ├── auth.ts          # Authentication helpers
│   ├── api-client.ts    # API client
│   └── react-query.tsx  # React Query provider
├── prisma/
│   └── schema.prisma    # Database schema
└── public/              # Static assets
```

## Usage

### Creating Your First User

Since authentication is simplified, you'll need to create a user in the database. You can use Prisma Studio:

```bash
npx prisma studio
```

Or create a seed script to add an initial admin user.

### Default Roles

- **SUPER_ADMIN**: Full system access
- **ADMIN**: Hotel operations (rooms, inventory, staff)
- **RECEPTIONIST**: Booking and billing operations
- **STAFF**: View-only access

## Features in Detail

### Room Management
- Create rooms with room number, type, floor, base price, and capacity
- Track room status (Available, Booked, Maintenance)
- Edit and delete rooms (Admin only)

### Booking Flow
1. Select date
2. Choose available room
3. Select time slot
4. Enter guest details
5. Confirm booking
6. Bill auto-generates

### Billing System
- Automatic bill generation
- GST calculation (18%)
- Payment tracking
- Print/Download functionality
- Partial payment support

### Inventory
- Track items by category
- Set minimum stock levels
- Low stock alerts
- Quantity tracking

## Development

### Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

### API Routes

All API routes are in `app/api/` directory. They follow RESTful conventions:
- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/[id]` - Get room
- `PUT /api/rooms/[id]` - Update room
- `DELETE /api/rooms/[id]` - Delete room

## Production Deployment

1. Update `.env` with production database URL
2. Run migrations: `npx prisma migrate deploy`
3. Build: `npm run build`
4. Start: `npm start`

## Notes

- This is a demo application. For production, implement proper authentication (NextAuth.js recommended)
- Add input validation and error handling
- Implement proper session management
- Add PDF generation for bills (react-pdf can be used)
- Add email/WhatsApp integration for bills
- Implement proper logging and monitoring

## License

MIT
