import { prisma } from './prisma'
import { sendPasswordResetCode } from './email'

/**
 * Generate a random 6-digit code
 */
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create a password reset request and send code via email
 */
export async function createPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true },
  })

  if (!user) {
    // Don't reveal if email exists or not (security best practice)
    return {
      success: true,
      message: 'If an account with that email exists, a reset code has been sent.',
    }
  }

  // Generate 6-digit code
  const code = generateResetCode()

  // Set expiration to 10 minutes from now
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 10)

  // Delete any existing unused reset codes for this user
  await prisma.passwordReset.deleteMany({
    where: {
      userId: user.id,
      used: false,
    },
  })

  // Create new password reset record
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      code,
      email: user.email!,
      expiresAt,
    },
  })

  // Send email with code
  const emailSent = await sendPasswordResetCode(user.email!, code, user.username)

  if (!emailSent) {
    // Clean up if email failed
    await prisma.passwordReset.deleteMany({
      where: {
        userId: user.id,
        code,
      },
    })
    return {
      success: false,
      message: 'Failed to send email. Please try again later.',
    }
  }

  return {
    success: true,
    message: 'If an account with that email exists, a reset code has been sent.',
  }
}

/**
 * Verify reset code and get user ID
 */
export async function verifyResetCode(
  email: string,
  code: string
): Promise<{ valid: boolean; userId?: string; message: string }> {
  const reset = await prisma.passwordReset.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: {
        gt: new Date(), // Not expired
      },
    },
    include: {
      user: {
        select: { id: true },
      },
    },
  })

  if (!reset) {
    return {
      valid: false,
      message: 'Invalid or expired reset code.',
    }
  }

  return {
    valid: true,
    userId: reset.userId,
    message: 'Code verified successfully.',
  }
}

/**
 * Mark reset code as used
 */
export async function markResetCodeAsUsed(
  email: string,
  code: string
): Promise<void> {
  await prisma.passwordReset.updateMany({
    where: {
      email,
      code,
    },
    data: {
      used: true,
    },
  })
}

/**
 * Clean up expired reset codes (call periodically)
 */
export async function cleanupExpiredResetCodes(): Promise<number> {
  const result = await prisma.passwordReset.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  })

  return result.count
}
