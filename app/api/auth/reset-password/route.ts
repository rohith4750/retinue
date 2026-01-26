import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { verifyResetCode, markResetCodeAsUsed } from '@/lib/password-reset'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})

// POST /api/auth/reset-password - Reset password with code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    // Verify reset code
    const verification = await verifyResetCode(validatedData.email, validatedData.code)

    if (!verification.valid || !verification.userId) {
      return Response.json(
        errorResponse('INVALID_CODE', verification.message),
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(validatedData.newPassword)

    // Update user password
    await prisma.user.update({
      where: { id: verification.userId },
      data: { password: hashedPassword },
    })

    // Mark reset code as used
    await markResetCodeAsUsed(validatedData.email, validatedData.code)

    return Response.json(
      successResponse(null, 'Password reset successfully. You can now login with your new password.')
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid input'),
        { status: 400 }
      )
    }

    console.error('Error in reset password:', error)
    return Response.json(
      errorResponse('SERVER_ERROR', 'An error occurred. Please try again later.'),
      { status: 500 }
    )
  }
}
