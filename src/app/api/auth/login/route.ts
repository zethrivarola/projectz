import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  requiredRole: z.enum(['SUPER_ADMIN', 'PHOTOGRAPHER']).optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, requiredRole } = LoginSchema.parse(body)

    console.log(`🔐 Login attempt: ${email}`)

    // Buscar usuario
    const user = await prisma.user.findUnique({
  where: { email: email.toLowerCase() },
  select: {
    id: true,
    email: true,
    passwordHash: true,
    firstName: true,
    lastName: true,
    role: true,
    isActive: true
  }
})

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verificar si está activo
    if (!user.isActive) {
      console.log(`❌ User inactive: ${email}`)
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      )
    }

    // Verificar password
    const isValidPassword = await AuthService.verifyPassword(
      password,
      user.passwordHash
    )

    if (!isValidPassword) {
      console.log(`❌ Invalid password: ${email}`)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verificar rol si se requiere
    if (requiredRole && user.role !== requiredRole) {
      console.log(`❌ Insufficient permissions: ${email} (${user.role})`)
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Generar token JWT
const tokens = AuthService.generateTokens({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.firstName || null,
  lastName: user.lastName || null
})

const response = NextResponse.json({
  success: true,
  token: tokens.accessToken,
  user: {
    id: user.id,
    email: user.email,
    role: user.role
  }
})

    // Setear cookie httpOnly
    response.cookies.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    })

    return response

  } catch (error) {
    console.error('❌ Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}