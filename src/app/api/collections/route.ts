import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateCollectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private', 'password_protected']).optional(),
  password: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dateTaken: z.string().datetime().optional(),
})

// GET /api/collections - List collections
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 Collections GET - Token:', token ? 'Present' : 'Missing')

    if (!token) {
      console.log('❌ No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('❌ Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`📋 Fetching collections for user: ${payload.email} (${payload.role})`)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const starred = searchParams.get('starred') === 'true'

    // Build where clause
    interface CollectionWhere {
  ownerId?: string
  isStarred?: boolean
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' }
    description?: { contains: string; mode: 'insensitive' }
  }>
}

const where: CollectionWhere = {
  // SUPER_ADMIN ve todas, PHOTOGRAPHER solo las suyas
  ...(payload.role !== 'SUPER_ADMIN' && { ownerId: payload.userId })
}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (starred) {
      where.isStarred = true
    }

    // Get collections from PostgreSQL
    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          _count: {
            select: { photos: true }
          },
          coverPhoto: {
            select: {
              id: true,
              thumbnailUrl: true,
              webUrl: true
            }
          },
          owner: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.collection.count({ where })
    ])

    const formattedCollections = collections.map(collection => ({
      id: collection.id,
      title: collection.title,
      description: collection.description,
      slug: collection.slug,
      visibility: collection.visibility,
      isStarred: collection.isStarred,
      isFeatured: collection.isFeatured,
      tags: collection.tags,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      dateTaken: collection.dateTaken,
      coverPhoto: collection.coverPhoto,
      owner: collection.owner,
      _count: {
        photos: collection._count.photos
      }
    }))

    console.log(`✅ Returning ${formattedCollections.length} collections`)

    return NextResponse.json({
      collections: formattedCollections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('❌ Collections GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/collections - Create collection
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 Collections POST - Token:', token ? 'Present' : 'Missing')

    if (!token) {
      console.log('❌ No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('❌ Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = CreateCollectionSchema.parse(body)

    console.log(`🔥 Creating collection: "${data.title}" for user: ${payload.email} (${payload.role})`)

    // Determinar visibilidad por rol
    let visibility = data.visibility
    if (!visibility) {
      // Default basado en rol
      visibility = payload.role === 'SUPER_ADMIN' ? 'public' : 'private'
    }

    // Validación: Fotógrafos solo pueden crear colecciones privadas
    if (payload.role === 'PHOTOGRAPHER' && visibility !== 'private') {
      console.log('❌ Photographer attempted to create non-private collection')
      return NextResponse.json(
        { error: 'Photographers can only create private collections' },
        { status: 403 }
      )
    }

    // Verificar límite de colecciones para fotógrafos
    if (payload.role === 'PHOTOGRAPHER') {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { maxCollections: true, _count: { select: { collections: true } } }
      })

      if (user && user._count.collections >= user.maxCollections) {
        console.log(`❌ Photographer reached collection limit: ${user.maxCollections}`)
        return NextResponse.json(
          { error: `Collection limit reached (${user.maxCollections} collections max)` },
          { status: 403 }
        )
      }
    }

    // Generate unique slug
    let slug = AuthService.generateSlug(data.title)
    let counter = 1
    while (await prisma.collection.findUnique({ where: { slug } })) {
      slug = `${AuthService.generateSlug(data.title)}-${counter}`
      counter++
    }

    // Hash password if provided
    let passwordHash = null
    if (visibility === 'password_protected' && data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }

    // Create collection in PostgreSQL
    const newCollection = await prisma.collection.create({
      data: {
        title: data.title,
        description: data.description || null,
        slug,
        ownerId: payload.userId,
        visibility,
        passwordHash,
        tags: data.tags,
        dateTaken: data.dateTaken ? new Date(data.dateTaken) : null,
      },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    })

    console.log(`✅ Collection "${data.title}" created with ID: ${newCollection.id} (visibility: ${visibility})`)

    return NextResponse.json({
      id: newCollection.id,
      title: newCollection.title,
      description: newCollection.description,
      slug: newCollection.slug,
      visibility: newCollection.visibility,
      isStarred: newCollection.isStarred,
      isFeatured: newCollection.isFeatured,
      tags: newCollection.tags,
      dateTaken: newCollection.dateTaken,
      createdAt: newCollection.createdAt,
      updatedAt: newCollection.updatedAt,
      coverPhoto: null,
      _count: {
        photos: newCollection._count.photos
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Collections POST error:', error)

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