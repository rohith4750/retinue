import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { verifyPassword } from '@/lib/auth'
import { generateCustomerToken } from '@/lib/jwt'

/**
 * POST /api/public/auth/login
 * Customer login with email + password (public site).
 * Body: { email, password }
 * Returns customerToken and customer on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = (body.email ?? '').trim().toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !email.includes('@')) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Valid email is required'),
        { status: 400 }
      )
    }
    if (!password) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Password is required'),
        { status: 400 }
      )
    }

    const customer = await (prisma as any).customer.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        passwordHash: { not: null },
      },
    })

    if (!customer?.passwordHash) {
      return Response.json(
        errorResponse('Invalid email or password', 'Invalid credentials'),
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, customer.passwordHash)
    if (!isValid) {
      return Response.json(
        errorResponse('Invalid email or password', 'Invalid credentials'),
        { status: 401 }
      )
    }

    const customerToken = generateCustomerToken({
      customerId: customer.id,
      phone: customer.phone,
    })

    return Response.json(
      successResponse({
        customerToken,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
        },
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Public login error:', err)
    return Response.json(
      errorResponse('SERVER_ERROR', 'Login failed'),
      { status: 500 }
    )
  }
}
