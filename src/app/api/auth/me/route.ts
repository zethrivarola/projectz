import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking authentication status...')

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    if (!token) {
      return NextResponse.json({ authenticated: false, error: 'No authentication token found' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ authenticated: false, error: 'Invalid authentication token' }, { status: 401 })
    }

    // Buscar usuario real en la base de datos
    const user = await prisma.user.findUnique({
      where: { email: payload.email } // o id: payload.userId si tu token tiene userId
    })

    if (!user) {
      return NextResponse.json({ authenticated: false, error: 'User not found' }, { status: 404 })
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
      { authenticated: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
