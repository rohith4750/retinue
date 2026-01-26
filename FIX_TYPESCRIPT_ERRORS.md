# Fixing TypeScript Errors

## Issues Found

1. **Prisma Client Not Generated**: `UserRole` and `PrismaClient` types are not available
2. **jsonwebtoken Not Installed**: Module not found error
3. **Type Errors in Bookings Page**: Implicit any types in CSV export
4. **Missing Variables in Rooms Page**: `searchQuery` and `debouncedSearch` not defined

## Solutions Applied

### 1. Added Type Fallbacks
- Added fallback type definitions for `UserRole` in files that need it
- This allows the code to compile even if Prisma client isn't generated yet

### 2. Conditional jsonwebtoken Import
- Made jsonwebtoken import conditional with try-catch
- Added error messages to guide installation

### 3. Fixed Type Errors
- Added explicit types to CSV export function
- Fixed missing state variables in rooms page

## Required Actions

### 1. Generate Prisma Client
```bash
npx prisma generate
```

This will generate the Prisma client and make `UserRole` and `PrismaClient` types available.

### 2. Install jsonwebtoken
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### 3. Install @types/node (if missing)
```bash
npm install --save-dev @types/node
```

## Files Modified

- `lib/jwt.ts` - Added conditional import and fallback types
- `lib/api-helpers.ts` - Added UserRole type fallback
- `app/api/bookings/route.ts` - Added UserRole type fallback
- `app/api/rooms/route.ts` - Added UserRole type fallback
- `app/bookings/page.tsx` - Fixed type errors in CSV export
- `app/rooms/page.tsx` - Added missing state variables

## After Running Commands

Once you run `npx prisma generate` and install the packages, you can:
1. Remove the fallback type definitions (optional, but recommended)
2. Update imports to use the actual Prisma types
3. The code will work with proper type checking

## Note

The fallback types are temporary workarounds. Once Prisma client is generated and packages are installed, the code will use the proper types automatically.
