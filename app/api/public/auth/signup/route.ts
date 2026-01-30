import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { verifySignupToken, extractTokenFromHeader } from '@/lib/jwt'

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

/**
 * POST /api/public/auth/signup
 * Complete sign-up with customer details (requires Bearer signupToken from verify-otp).
 * Body: { name, phone?, email?, address? } — phone required if token has email; email optional if token has phone.
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'))
    const payload = token ? verifySignupToken(token) : null

    if (!payload || payload.purpose !== 'SIGNUP') {
      return Response.json(
        errorResponse('UNAUTHORIZED', 'Invalid or expired signup token. Please verify OTP again.'),
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const emailBody = body.email != null ? String(body.email).trim() : ''
    const address = body.address != null ? String(body.address).trim() : ''
    const phoneBody = body.phone != null ? normalizePhone(String(body.phone)) : ''

    if (!name || name.length < 2) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Name must be at least 2 characters'),
        { status: 400 }
      )
    }

    let phone: string
    let email: string | null

    if (payload.phone) {
      phone = normalizePhone(payload.phone)
      if (phone.length !== 10) {
        return Response.json(
          errorResponse('VALIDATION_ERROR', 'Invalid phone in token'),
          { status: 400 }
        )
      }
      email = emailBody || null
    } else if (payload.email) {
      // OTP was sent to email; phone is required in body to create Customer
      if (phoneBody.length !== 10) {
        return Response.json(
          errorResponse('VALIDATION_ERROR', 'Phone (10 digits) is required to complete sign-up'),
          { status: 400 }
        )
      }
      phone = phoneBody
      email = payload.email || emailBody || null
    } else {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Invalid signup token'),
        { status: 400 }
      )
    }

    const customer = await (prisma as any).customer.upsert({
      where: { phone },
      create: {
        phone,
        name,
        email: email || null,
        address: address || null,
      },
      update: {
        name,
        email: email || null,
        address: address || null,
      },
    })

    return Response.json(
      successResponse(
        {
          customer: {
            id: customer.id,
            phone: customer.phone,
            name: customer.name,
            email: customer.email,
            address: customer.address,
            createdAt: customer.createdAt,
          },
        },
        'Sign up successful'
      ),
      { status: 201 }
    )
  } catch (err) {
    console.error('Signup error:', err)
    return Response.json(
      errorResponse('SERVER_ERROR', 'Sign up failed'),
      { status: 500 }
    )
  }
}
