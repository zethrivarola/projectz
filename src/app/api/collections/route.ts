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
  isFeatured: z.boolean().default(false),
  isStarred: z.boolean().default(false),
})

// GET /api/collections - List collections
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 Collections GET')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`📋 Fetching collections for user: ${payload.email} (${payload.role})`)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const starred = searchParams.get('starred') === 'true'
    const type = searchParams.get('type') // 'portfolio' o 'client'

    // Build where clause
    interface CollectionWhere {
      ownerId?: string
      isStarred?: boolean
      visibility?: string | { in: string[] }
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' }
        description?: { contains: string; mode: 'insensitive' }
      }>
    }

    const where: CollectionWhere = {
      ownerId: payload.userId, // Solo collections del usuario actual
    }

    if (starred) {
      where.isStarred = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtrar por tipo si se especifica
    if (type === 'portfolio') {
      // Collections sin ownerId específico (portfolios públicos del admin)
      where.visibility = 'public'
    } else if (type === 'client') {
      // Collections con ownerId de clientes
      where.visibility = { in: ['private', 'password_protected'] }
    }

    const skip = (page - 1) * limit

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          coverPhoto: {
            select: {
              id: true,
              thumbnailUrl: true,
              webUrl: true,
            }
          },
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            }
          },
          _count: {
            select: { photos: true }
          }
        }
      }),
      prisma.collection.count({ where })
    ])

    // Calculate total size for each collection
    const collectionsWithSize = await Promise.all(
      collections.map(async (collection) => {
        const photos = await prisma.photo.findMany({
          where: { collectionId: collection.id },
          select: { fileSize: true }
        })

        const totalSizeBytes = photos.reduce((acc, photo) => {
          return acc + BigInt(photo.fileSize)
        }, BigInt(0))

        return {
          ...collection,
          totalSizeBytes: totalSizeBytes.toString(),
        }
      })
    )

    console.log(`✅ Found ${collections.length} collections (total: ${total})`)

    return NextResponse.json({
      collections: collectionsWithSize,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('❌ GET Collections error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/collections - Create new collection (for current user)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 Collections POST')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = CreateCollectionSchema.parse(body)

    // Generate unique slug
    const baseSlug = AuthService.generateSlug(data.title)
    let slug = baseSlug
    let counter = 1

    while (await prisma.collection.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Hash password if needed
    let passwordHash = null
    if (data.visibility === 'password_protected' && data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }

    // Create collection for current user (portfolio público si es SUPER_ADMIN)
    const collection = await prisma.collection.create({
      data: {
        title: data.title,
        description: data.description,
        slug,
        ownerId: payload.userId, // Asignar al usuario actual
        visibility: data.visibility,
        passwordHash,
        tags: data.tags,
        dateTaken: data.dateTaken ? new Date(data.dateTaken) : null,
        isFeatured: data.isFeatured,
        isStarred: data.isStarred,
      },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    })

    console.log(`✅ Collection created: ${collection.title} by ${payload.email}`)

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
