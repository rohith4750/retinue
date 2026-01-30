import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { generateSignupToken, generateCustomerToken } from '@/lib/jwt'

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

/**
 * POST /api/public/auth/verify-otp
 * Verify OTP and return short-lived signup token (no auth).
 * Body: { phone, otp } OR { email, otp }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawPhone = body.phone
    const rawEmail = (body.email || '').trim().toLowerCase()
    const phone = rawPhone ? normalizePhone(rawPhone) : ''
    const otp = String(body.otp || '').replace(/\D/g, '')

    const useEmail = !!rawEmail

    if (otp.length < 4 || otp.length > 10) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Invalid OTP'),
        { status: 400 }
      )
    }

    if (useEmail) {
      if (!rawEmail || !rawEmail.includes('@')) {
        return Response.json(
          errorResponse('VALIDATION_ERROR', 'Email is required'),
          { status: 400 }
        )
      }

      const record = await (prisma as any).otpVerification.findFirst({
        where: { email: rawEmail, purpose: 'SIGNUP' },
        orderBy: { createdAt: 'desc' },
      })

      if (!record) {
        return Response.json(
          errorResponse('INVALID_OTP', 'No OTP found for this email. Request a new OTP.'),
          { status: 400 }
        )
      }

      if (new Date() > record.expiresAt) {
        return Response.json(
          errorResponse('OTP_EXPIRED', 'OTP has expired. Request a new OTP.'),
          { status: 400 }
        )
      }

      if (record.code !== otp) {
        return Response.json(
          errorResponse('INVALID_OTP', 'Invalid OTP'),
          { status: 400 }
        )
      }

      await (prisma as any).otpVerification.deleteMany({
        where: { id: record.id },
      })

      const signupToken = generateSignupToken({ email: rawEmail })
      const existingCustomer = await (prisma as any).customer.findFirst({
        where: { email: { equals: rawEmail, mode: 'insensitive' } },
      })
      const customerToken = existingCustomer
        ? generateCustomerToken({ customerId: existingCustomer.id, phone: existingCustomer.phone })
        : undefined

      return Response.json(
        successResponse({
          signupToken,
          ...(customerToken && { customerToken }),
          email: rawEmail,
          expiresIn: 600,
        }),
        { status: 200 }
      )
    }

    if (phone.length !== 10) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Phone (10 digits) or email is required'),
        { status: 400 }
      )
    }

    const record = await (prisma as any).otpVerification.findFirst({
      where: { phone, purpose: 'SIGNUP' },
      orderBy: { createdAt: 'desc' },
    })

    if (!record) {
      return Response.json(
        errorResponse('INVALID_OTP', 'No OTP found for this number. Request a new OTP.'),
        { status: 400 }
      )
    }

    if (new Date() > record.expiresAt) {
      return Response.json(
        errorResponse('OTP_EXPIRED', 'OTP has expired. Request a new OTP.'),
        { status: 400 }
      )
    }

    if (record.code !== otp) {
      return Response.json(
        errorResponse('INVALID_OTP', 'Invalid OTP'),
        { status: 400 }
      )
    }

    await (prisma as any).otpVerification.deleteMany({
      where: { id: record.id },
    })

    const signupToken = generateSignupToken({ phone })
    const existingCustomer = await (prisma as any).customer.findUnique({
      where: { phone },
    })
    const customerToken = existingCustomer
      ? generateCustomerToken({ customerId: existingCustomer.id, phone: existingCustomer.phone })
      : undefined

    return Response.json(
      successResponse({
        signupToken,
        ...(customerToken && { customerToken }),
        phone,
        expiresIn: 600,
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Verify OTP error:', err)
    return Response.json(
      errorResponse('SERVER_ERROR', 'Verification failed'),
      { status: 500 }
    )
  }
}
