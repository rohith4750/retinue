import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { sendOtpSms } from '@/lib/fast2sms'

const OTP_EXPIRY_MINUTES = 10
const OTP_LENGTH = 6
const RATE_LIMIT_SECONDS = 60 // One OTP per phone per 60 seconds

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

/**
 * POST /api/public/auth/send-otp
 * Send OTP to phone via Fast2SMS (no auth). Body: { phone }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawPhone = body.phone
    const phone = normalizePhone(rawPhone)

    if (phone.length !== 10) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Phone must be 10 digits'),
        { status: 400 }
      )
    }

    // Rate limit: do not send again within RATE_LIMIT_SECONDS
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
      return Response.json(
        errorResponse('SMS_FAILED', result.message || 'Failed to send OTP'),
        { status: 502 }
      )
    }

    return Response.json(
      successResponse(
        { expiresIn: OTP_EXPIRY_MINUTES * 60 },
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
