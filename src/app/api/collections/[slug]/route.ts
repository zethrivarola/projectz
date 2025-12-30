import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateCollectionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private', 'password_protected']).optional(),
  password: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dateTaken: z.string().datetime().optional(),
  isStarred: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

// Helper para verificar si es admin (solo SUPER_ADMIN)
function isAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN'
}

// GET /api/collections/[slug] - Get single collection with photos (PUBLIC + ADMIN)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    // Verificar si es modo preview (no mostrar fotos ocultas)
    const url = new URL(request.url)
    const isPreviewMode = url.searchParams.get('preview') === 'true'
    console.log(`🔍 GET Collection by slug: ${slug}`)

    // Try to verify token (optional for public collections)
    let payload = null
    if (token) {
      payload = AuthService.verifyToken(token)
    }
// Primero obtener ownerId para verificar permisos
    const collectionBasic = await prisma.collection.findUnique({
      where: { slug },
      select: { ownerId: true }
    })

    // Verificar si puede ver fotos ocultas (admin o owner)
    const isOwnerForPhotos = payload && collectionBasic?.ownerId === payload.userId
    const canSeeHidden = !isPreviewMode && payload && (
      payload.role === 'SUPER_ADMIN' || 
      payload.role === 'PHOTOGRAPHER' ||
      isOwnerForPhotos
    )
    
// Get collection with photos
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        photos: {
 where: { 
            processingStatus: 'completed',
            ...(canSeeHidden ? {} : { isHidden: false })
          },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            fileSize: true,
            thumbnailUrl: true,
            webUrl: true,
            highResUrl: true,
            originalUrl: true,
            width: true,
            height: true,
            isRaw: true,
            orderIndex: true,
            isStarred: true,
isHidden: true,            
processingStatus: true,
            createdAt: true,
          }
        },
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true
          }
        },
        _count: {
          select: { photos: true }
        }
      }
    })

    if (!collection) {
      console.log(`❌ Collection not found: ${slug}`)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check access permissions
    const isOwner = payload && collection.ownerId === payload.userId
    const userIsAdmin = payload && isAdmin(payload.role)
    const isPublic = collection.visibility === 'public'

    // If not public and user is not owner/admin, deny access
    if (!isPublic && !isOwner && !userIsAdmin) {
      console.log(`❌ Access denied: Collection is ${collection.visibility}`)
      return NextResponse.json({ error: 'This collection is private' }, { status: 403 })
    }

    console.log(`✅ Collection found: ${collection.title} with ${collection.photos.length} photos`)

    // Return in gallery format
    return NextResponse.json({
      collection: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        slug: collection.slug,
        coverPhoto: collection.coverPhoto,
        tags: collection.tags,
        dateTaken: collection.dateTaken,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        visibility: collection.visibility,
        isStarred: collection.isStarred,
        isFeatured: collection.isFeatured,
        _count: collection._count,
        design: {
          coverLayout: collection.coverLayout || 'center',
          typography: {
            titleFont: collection.typographyStyle || 'Inter',
            titleSize: collection.titleSize || 48,
            titleColor: collection.titleColor || '#ffffff'
          },
          colors: {
            background: collection.customBackgroundColor || '#ffffff',
            accent: collection.customAccentColor || '#000000'
          },
          grid: {
            columns: collection.gridColumns || 4,
            spacing: collection.gridSpacing || 8
          },
          coverFocus: collection.coverFocalPoint || { x: 50, y: 50 }
        }
      },
      photos: collection.photos.map(photo => ({
        ...photo,
        fileSize: photo.fileSize ? Number(photo.fileSize) : undefined
      }))
    })
  } catch (error) {
    console.error('❌ GET Collection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/collections/[slug] - Update collection (ADMIN ONLY)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 PATCH Collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = UpdateCollectionSchema.parse(body)

    // Check if collection exists and user owns it
    const existingCollection = await prisma.collection.findUnique({
      where: { slug }
    })

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const userIsAdmin = isAdmin(payload.role)
    if (existingCollection.ownerId !== payload.userId && !userIsAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Handle password
    let passwordHash = existingCollection.passwordHash
    if (data.visibility === 'password_protected' && data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    } else if (data.visibility !== 'password_protected') {
      passwordHash = null
    }

    // Update collection
    const updatedCollection = await prisma.collection.update({
      where: { slug },
      data: {
        title: data.title,
        description: data.description,
        visibility: data.visibility,
        passwordHash,
        tags: data.tags,
        dateTaken: data.dateTaken ? new Date(data.dateTaken) : undefined,
        isStarred: data.isStarred,
        isFeatured: data.isFeatured,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { photos: true }
        }
      }
    })

    console.log(`✅ Collection updated: ${updatedCollection.title}`)

    return NextResponse.json({
      id: updatedCollection.id,
      title: updatedCollection.title,
      description: updatedCollection.description,
      slug: updatedCollection.slug,
      visibility: updatedCollection.visibility,
      isStarred: updatedCollection.isStarred,
      isFeatured: updatedCollection.isFeatured,
      tags: updatedCollection.tags,
      dateTaken: updatedCollection.dateTaken,
      createdAt: updatedCollection.createdAt,
      updatedAt: updatedCollection.updatedAt,
      _count: updatedCollection._count
    })

  } catch (error) {
    console.error('❌ PATCH Collection error:', error)

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

// DELETE /api/collections/[slug] - Delete collection (ADMIN ONLY)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 DELETE Collection: ${slug}`)

    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('❌ Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`👤 User attempting delete: ${payload.email} (role: ${payload.role})`)

    // Check if collection exists and user owns it
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        photos: true
      }
    })

    if (!collection) {
      console.log('❌ Collection not found')
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const userIsAdmin = isAdmin(payload.role)
    console.log(`🔐 Admin check: ${userIsAdmin}, Owner check: ${collection.ownerId === payload.userId}`)

    if (collection.ownerId !== payload.userId && !userIsAdmin) {
      console.log('❌ Access denied - Not owner or admin')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete collection (cascade will delete photos)
    await prisma.collection.delete({
      where: { slug }
    })

    console.log(`✅ Collection deleted: ${collection.title} (${collection.photos.length} photos)`)

    return NextResponse.json({
      message: 'Collection deleted successfully',
      deletedPhotos: collection.photos.length
    })

  } catch (error) {
    console.error('❌ DELETE Collection error:', error)
    return NextResponse.json(
      { error: 'Failed to delete collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
