import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { sendOtpSms } from '@/lib/fast2sms'
import { sendOtpEmail } from '@/lib/email'

const OTP_EXPIRY_MINUTES = 10
const OTP_LENGTH = 6
const RATE_LIMIT_SECONDS = 60

function generateOtp(): string {
  let code = ''
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())
}

/**
 * POST /api/public/auth/send-otp
 * Send OTP via email or SMS (no auth).
 * Body: { phone } OR { email }
 * Use email until Fast2SMS DLT is approved; then use phone for SMS.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawPhone = body.phone
    const rawEmail = (body.email || '').trim().toLowerCase()
    const phone = rawPhone ? normalizePhone(rawPhone) : ''
    const useEmail = !!rawEmail

    if (useEmail) {
      // --- Email OTP (use until DLT approved) ---
      if (!isValidEmail(rawEmail)) {
        return Response.json(
          errorResponse('VALIDATION_ERROR', 'Valid email is required'),
          { status: 400 }
        )
      }

      const recent = await (prisma as any).otpVerification.findFirst({
        where: { email: rawEmail, purpose: 'SIGNUP' },
        orderBy: { createdAt: 'desc' },
      })
      if (recent) {
        const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000
        if (elapsed < RATE_LIMIT_SECONDS) {
          return Response.json(
            errorResponse('RATE_LIMIT', 'Please wait before requesting another OTP'),
            { status: 429 }
          )
        }
      }

      const code = generateOtp()
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

      await (prisma as any).otpVerification.create({
        data: {
          email: rawEmail,
          code,
          purpose: 'SIGNUP',
          expiresAt,
        },
      })

      const sent = await sendOtpEmail(rawEmail, code)
      if (!sent) {
        return Response.json(
          errorResponse('EMAIL_FAILED', 'Failed to send OTP to email. Try again or use phone when SMS is available.'),
          { status: 502 }
        )
      }

      return Response.json(
        successResponse(
          { expiresIn: OTP_EXPIRY_MINUTES * 60, channel: 'email' },
          'OTP sent to your email'
        ),
        { status: 200 }
      )
    }

    // --- Phone / SMS OTP (when Fast2SMS DLT is approved) ---
    if (phone.length !== 10) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Phone (10 digits) or email is required'),
        { status: 400 }
      )
    }

    const recent = await (prisma as any).otpVerification.findFirst({
      where: { phone, purpose: 'SIGNUP' },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      const elapsed = (Date.now() - recent.createdAt.getTime()) / 1000
      if (elapsed < RATE_LIMIT_SECONDS) {
        return Response.json(
          errorResponse('RATE_LIMIT', 'Please wait before requesting another OTP'),
          { status: 429 }
        )
      }
    }

    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await (prisma as any).otpVerification.create({
      data: {
        phone,
        code,
        purpose: 'SIGNUP',
        expiresAt,
      },
    })

    const result = await sendOtpSms(phone, code)
    if (!result.ok) {
      console.error('[send-otp] Fast2SMS failed:', result.message)
      return Response.json(
        errorResponse('SMS_FAILED', result.message || 'SMS not available. Use email for OTP until DLT is approved.'),
        { status: 502 }
      )
    }

    return Response.json(
      successResponse(
        { expiresIn: OTP_EXPIRY_MINUTES * 60, channel: 'sms' },
        'OTP sent to your mobile number'
      ),
      { status: 200 }
    )
  } catch (err: any) {
    if (err.message?.includes('FAST2SMS')) {
      return Response.json(
        errorResponse('CONFIG_ERROR', 'SMS service not configured'),
        { status: 503 }
      )
    }
    console.error('Send OTP error:', err)
    return Response.json(
      errorResponse('SERVER_ERROR', 'Failed to send OTP'),
      { status: 500 }
    )
  }
}
