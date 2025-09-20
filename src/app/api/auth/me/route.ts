import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

// Personal user account
const demoUsers = [
  {
    id: 'user-1',
    email: 'photographer@demo.com',
    firstName: 'Personal',
    lastName: 'Portfolio',
    role: 'owner'
  }
]

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking authentication status...')

    // Get token from various sources
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value

    const token = bearerToken || cookieToken

    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing')
    console.log('🔍 Cookie token:', cookieToken ? 'Present' : 'Missing')
    console.log('🔍 Using token:', token ? 'Present' : 'Missing')

    if (!token) {
      console.log('❌ No authentication token found')
      return NextResponse.json({
        authenticated: false,
        error: 'No authentication token found'
      }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('❌ Invalid authentication token')
      return NextResponse.json({
        authenticated: false,
        error: 'Invalid authentication token'
      }, { status: 401 })
    }

    // Find user data
    const user = demoUsers.find(u => u.id === payload.userId)
    if (!user) {
      console.log('❌ User not found for ID:', payload.userId)
      return NextResponse.json({
        authenticated: false,
        error: 'User not found'
      }, { status: 404 })
    }

    console.log('✅ Authentication successful for:', user.email)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokenInfo: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      }
    })

  } catch (error) {
    console.error('❌ Auth check error:', error)
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
