import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Solo SUPER_ADMIN puede gestionar clientes
function isAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN'
}

const CreateClientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

// GET /api/clients - Listar todos los clientes
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 GET Clients')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Obtener todos los usuarios con rol CLIENT
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { collections: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ Found ${clients.length} clients`)

    return NextResponse.json({ clients })

  } catch (error) {
    console.error('❌ GET Clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 POST Create Client')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const data = CreateClientSchema.parse(body)

    // Verificar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(data.password)

    // Crear cliente
    const client = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'CLIENT',
        emailVerified: true,
        isActive: true,
        createdById: payload.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    console.log(`✅ Client created: ${client.email}`)

    return NextResponse.json({ client }, { status: 201 })

  } catch (error) {
    console.error('❌ POST Client error:', error)

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
