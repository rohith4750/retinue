import { compare, hash } from 'bcryptjs'
import { prisma } from './prisma'

// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST' | 'STAFF'

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

export async function createUser(username: string, password: string, role: UserRole, email: string) {
  const hashedPassword = await hashPassword(password)
  return prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role,
    },
  })
}

export async function authenticateUser(email: string, password: string) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return null
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    STAFF: 1,
    RECEPTIONIST: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}
