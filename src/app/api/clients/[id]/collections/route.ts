import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function isAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN'
}

const CreateCollectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private', 'password_protected']).default('private'),
  password: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dateTaken: z.string().datetime().optional(),
})

// POST /api/clients/[id]/collections - Crear collection para un cliente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 POST Collection for client: ${clientId}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verificar que el cliente existe
    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'CLIENT' }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const body = await request.json()
    const data = CreateCollectionSchema.parse(body)

    // Generar slug único
    const baseSlug = AuthService.generateSlug(data.title)
    let slug = baseSlug
    let counter = 1

    while (await prisma.collection.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Hash password si es necesario
    let passwordHash = null
    if (data.visibility === 'password_protected' && data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }

    // Crear collection para el cliente
    const collection = await prisma.collection.create({
      data: {
        title: data.title,
        description: data.description,
        slug,
        ownerId: clientId, // ← Asignar al cliente
        visibility: data.visibility,
        passwordHash,
        tags: data.tags,
        dateTaken: data.dateTaken ? new Date(data.dateTaken) : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        },
        _count: {
          select: { photos: true }
        }
      }
    })

    console.log(`✅ Collection created for client ${client.email}: ${collection.title}`)

    return NextResponse.json({ collection }, { status: 201 })

  } catch (error) {
    console.error('❌ POST Collection error:', error)

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
