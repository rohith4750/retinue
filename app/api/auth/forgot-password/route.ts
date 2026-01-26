import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { createPasswordReset } from '@/lib/password-reset'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)

    // Create password reset and send email
    const result = await createPasswordReset(validatedData.email)

    if (!result.success) {
      return Response.json(
        errorResponse('EMAIL_ERROR', result.message),
        { status: 500 }
      )
    }

    // Always return success (don't reveal if email exists)
    return Response.json(
      successResponse(null, result.message)
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', error.errors[0]?.message || 'Invalid input'),
        { status: 400 }
      )
    }

    console.error('Error in forgot password:', error)
    return Response.json(
      errorResponse('SERVER_ERROR', 'An error occurred. Please try again later.'),
      { status: 500 }
    )
  }
}
