import { NextRequest } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json(
        errorResponse('Missing credentials', 'Username and password are required'),
        { status: 400 }
      )
    }

    const user = await authenticateUser(username, password)

    if (!user) {
      return Response.json(
        errorResponse('Invalid credentials', 'Username or password is incorrect'),
        { status: 401 }
      )
    }

    // In production, generate JWT token here
    return Response.json(successResponse(user, 'Login successful'))
  } catch (error) {
    console.error('Login error:', error)
    return Response.json(
      errorResponse('Server error', 'An error occurred during login'),
      { status: 500 }
    )
  }
}
