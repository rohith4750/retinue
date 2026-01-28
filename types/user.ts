// UserRole type - will be available from @prisma/client after running: npx prisma generate
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPTIONIST'

/**
 * User Types
 */
export interface User {
  id: string
  username: string
  email: string | null
  role: UserRole
  createdAt: Date | string
  updatedAt: Date | string
}

export interface UserCreateRequest {
  username: string
  password: string
  email?: string
  role: UserRole
}

export interface UserUpdateRequest {
  username?: string
  email?: string
  role?: UserRole
  password?: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
}

export interface PasswordResetRequest {
  username: string
  email?: string
}

export interface SessionInfo {
  user: User
  expiresAt: Date
  rememberMe: boolean
}
