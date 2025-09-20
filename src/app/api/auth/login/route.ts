import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

interface DemoUser {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'client'  // <- Cambiar 'user' por 'client'
}

// Personal user account (replace with database in production)
const demoUsers: DemoUser[] = [
  {
    id: 'user-1',
    email: 'photographer@demo.com',
    password: 'demo123', // In production, this would be hashed
    firstName: 'Personal',
    lastName: 'Portfolio',
    role: 'owner'
  }
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = LoginSchema.parse(body)

    console.log(`🔐 Login attempt for: ${email}`)

    // Find user in demo data
    const user = demoUsers.find(u => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // In production, use AuthService.comparePasswords for hashed passwords
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT tokens
    const tokens = AuthService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role
    })

    console.log(`✅ Login successful for: ${email} (${user.role})`)

    // Set cookie and return user data
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token: tokens.accessToken
    })

    // Set HTTP-only cookie for authentication
    response.cookies.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days (matching JWT expiration)
      path: '/', // Ensure cookie is available on all paths
      domain: undefined // Let browser handle domain
    })

    console.log('🍪 Authentication cookie set for user:', user.email)

    return response

  } catch (error) {
    console.error('❌ Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/auth/login - Get current user (for testing authentication)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Find user data
    const user = demoUsers.find(u => u.id === payload.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      authenticated: true
    })

  } catch (error) {
    console.error('❌ Auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Demo login info endpoint
export async function OPTIONS() {
  return NextResponse.json({
    demo: true,
    message: 'Personal authentication system',
    testUsers: [
      { email: 'photographer@demo.com', password: 'demo123', role: 'owner' }
    ]
  })
}