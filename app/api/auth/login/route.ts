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
  } catch (error: any) {
    console.error('Login error:', error)
    
    // More detailed error messages for debugging
    const errorMessage = error?.message || 'An error occurred during login'
    
    // Check if it's a database connection error
    if (errorMessage.includes('connect') || errorMessage.includes('P1001') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
      return Response.json(
        errorResponse('Database error', 'Database connection failed. Please check your database configuration.'),
        { status: 500 }
      )
    }
    
    return Response.json(
      errorResponse('Server error', errorMessage),
      { status: 500 }
    )
  }
}
