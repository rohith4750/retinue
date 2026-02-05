import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'
import { generateCustomerToken } from '@/lib/jwt'

function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())
}

/**
 * POST /api/public/auth/signup-direct
 * Create account without OTP. Body: email, password, name, phone, address?
 * Returns customerToken and customer (same as login).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = (body.email ?? '').trim().toLowerCase()
    const rawPassword = typeof body.password === 'string' ? body.password : ''
    const name = String(body.name ?? '').trim()
    const phone = normalizePhone(String(body.phone ?? ''))
    const address = body.address != null ? String(body.address).trim() : null

    if (!email || !isValidEmail(email)) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Valid email is required'),
        { status: 400 }
      )
    }
    if (rawPassword.length < 6) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Password must be at least 6 characters'),
        { status: 400 }
      )
    }
    if (!name || name.length < 2) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Name must be at least 2 characters'),
        { status: 400 }
      )
    }
    if (phone.length !== 10) {
      return Response.json(
        errorResponse('VALIDATION_ERROR', 'Phone must be 10 digits'),
        { status: 400 }
      )
    }

    const existingByPhone = await (prisma as any).customer.findUnique({
      where: { phone },
    })
    if (existingByPhone) {
      return Response.json(
        errorResponse('CONFLICT', 'This phone number is already registered'),
        { status: 409 }
      )
    }

    const existingByEmail = await (prisma as any).customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (existingByEmail) {
      return Response.json(
        errorResponse('CONFLICT', 'This email is already registered'),
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(rawPassword)

    const customer = await (prisma as any).customer.create({
      data: {
        phone,
        name,
        email,
        address: address || null,
        passwordHash,
      },
    })

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
          createdAt: customer.createdAt,
        },
      }),
      { status: 201 }
    )
  } catch (err) {
    console.error('Signup-direct error:', err)
    return Response.json(
      errorResponse('SERVER_ERROR', 'Sign up failed'),
      { status: 500 }
    )
  }
}
