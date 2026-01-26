# 🔐 Default User Credentials

Default users for all roles in the Hotel Management System.

## 📋 Default Users

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **SUPER_ADMIN** | `superadmin` | `superadmin123` | Full system access |
| **ADMIN** | `admin` | `admin123` | Hotel operations management |
| **RECEPTIONIST** | `receptionist` | `receptionist123` | Booking & billing |
| **STAFF** | `staff` | `staff123` | View-only access |

## 🚀 How to Create Users

### Option 1: Using API Endpoint (Recommended)

1. **Via UI:**
   - Navigate to `/auth/users` page
   - Click "Create Default Users" button
   - Users will be created automatically

2. **Via API:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/create-users
   ```

### Option 2: Using Script

Run the script directly:

```bash
npm run create-users
```

Or:

```bash
npx tsx scripts/create-default-users.ts
```

## ✅ Verification

After creating users, you can verify by:

1. **Check via API:**
   ```bash
   curl http://localhost:3001/api/auth/create-users
   ```

2. **Check via UI:**
   - Navigate to `/auth/users` page
   - View all created users

3. **Login Test:**
   - Go to `/login` page
   - Try logging in with any of the credentials above

## 🔒 Security Notes

⚠️ **IMPORTANT:** These are default credentials for development/testing.

**For Production:**
- Change all default passwords immediately
- Use strong, unique passwords
- Implement password policies
- Enable 2FA if possible
- Regularly rotate passwords

## 📝 Role Permissions

### SUPER_ADMIN
- Full system access
- Can manage all modules
- User management
- System configuration

### ADMIN
- Hotel operations management
- Room management
- Staff management
- Inventory management
- View all bookings and reports

### RECEPTIONIST
- Create and manage bookings
- Process payments
- Update booking status
- View bookings and bills
- Cannot delete or modify system settings

### STAFF
- View-only access
- Can view bookings, rooms, inventory
- Cannot create or modify data
- Limited to viewing information

## 🔄 Updating Passwords

To change a user's password, you'll need to:

1. Update the password hash in the database
2. Or create a password update API endpoint
3. Or use Prisma Studio to manually update

---

**Status:** ✅ Default users ready to create!
