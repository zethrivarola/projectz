import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const AddFavoriteSchema = z.object({
  photoId: z.string(),
  clientEmail: z.string().email().optional(),
  action: z.enum(['add', 'remove']).optional(),
  notes: z.string().optional(),
})

interface FavoriteWhereClause {
  photo: {
    collectionId: string
  }
  clientEmail?: string
  OR?: Array<{
    clientEmail?: null
    anonymousId?: string
  }>
}

// Helper to generate anonymous client identifier
function generateClientIdentifier(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown'
  
  const hash = crypto.createHash('sha256')
  hash.update(`${userAgent}_${ip}`)
  return hash.digest('hex').substring(0, 16)
}

// GET /api/gallery/[token]/favorites - Get favorites for this gallery
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { searchParams } = new URL(request.url)
    const clientEmail = searchParams.get('clientEmail')
    const anonymous = searchParams.get('anonymous') === 'true'

    // Verify gallery access
    const share = await prisma.collectionShare.findUnique({
      where: { accessToken: token },
      select: { collectionId: true }
    })

    if (!share) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 404 })
    }

    // Get favorites for this collection
    const whereClause: FavoriteWhereClause = {
      photo: {
        collectionId: share.collectionId
      }
    }

    if (clientEmail && !anonymous) {
      whereClause.clientEmail = clientEmail
    } else if (anonymous) {
      // For anonymous users, return aggregate data only
      const anonymousId = generateClientIdentifier(request)
      whereClause.OR = [
        { clientEmail: null },
        { anonymousId: anonymousId }
      ]
    }

    const favorites = await prisma.photoFavorite.findMany({
      where: whereClause,
      include: {
        photo: {
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            thumbnailUrl: true,
            webUrl: true,
            orderIndex: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get analytics for the collection
    const favoriteStats = await prisma.photoFavorite.groupBy({
      by: ['photoId'],
      where: {
        photo: {
          collectionId: share.collectionId
        }
      },
      _count: {
        photoId: true
      },
      orderBy: {
        _count: {
          photoId: 'desc'
        }
      }
    })

    const response = {
      favorites,
      analytics: {
        totalFavorites: favorites.length,
        uniquePhotos: favoriteStats.length,
        mostFavorited: favoriteStats[0] || null,
        photoStats: favoriteStats
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Favorites GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/gallery/[token]/favorites - Add/Remove photo favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const data = AddFavoriteSchema.parse(body)

    // Verify gallery access
    const share = await prisma.collectionShare.findUnique({
      where: { accessToken: token },
      select: { collectionId: true }
    })

    if (!share) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 404 })
    }

    // Verify photo belongs to this collection
    const photo = await prisma.photo.findFirst({
      where: {
        id: data.photoId,
        collectionId: share.collectionId,
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found in collection' }, { status: 404 })
    }

    // Handle anonymous vs authenticated favorites
    const clientIdentifier = data.clientEmail || `anon_${generateClientIdentifier(request)}`
    const isAnonymous = !data.clientEmail

    // Check for existing favorite
    const whereClause = isAnonymous 
      ? { photoId: data.photoId, anonymousId: clientIdentifier }
      : { photoId: data.photoId, clientEmail: data.clientEmail! }

    const existingFavorite = await prisma.photoFavorite.findFirst({
      where: whereClause
    })

    let result

    if (data.action === 'remove' || (existingFavorite && !data.action)) {
      // Remove favorite
      if (existingFavorite) {
        await prisma.photoFavorite.delete({
          where: { id: existingFavorite.id }
        })
        
        result = {
          action: 'removed',
          photoId: data.photoId,
          clientIdentifier: clientIdentifier.startsWith('anon_') ? 'anonymous' : clientIdentifier
        }
      } else {
        return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
      }
    } else {
      // Add favorite
      if (existingFavorite) {
        return NextResponse.json({ 
          message: 'Photo already favorited',
          favorite: existingFavorite 
        })
      }

      const favoriteData: Record<string, unknown> = {
        photoId: data.photoId,
        notes: data.notes,
      }

      if (isAnonymous) {
        favoriteData.anonymousId = clientIdentifier
      } else {
        favoriteData.clientEmail = data.clientEmail
      }

      const favorite = await prisma.photoFavorite.create({
        data: favoriteData,
        include: {
          photo: {
            select: {
              id: true,
              filename: true,
              originalFilename: true,
              thumbnailUrl: true,
              webUrl: true,
              orderIndex: true,
            }
          }
        }
      })

      result = {
        action: 'added',
        favorite,
        clientIdentifier: clientIdentifier.startsWith('anon_') ? 'anonymous' : clientIdentifier
      }
    }

    // Log the activity (enhanced)
    await prisma.viewActivity.create({
      data: {
        collectionId: share.collectionId,
        photoId: data.photoId,
        clientEmail: isAnonymous ? null : data.clientEmail,
        anonymousId: isAnonymous ? clientIdentifier : null,
        activityType: data.action === 'remove' ? 'unfavorite' : 'favorite',
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      }
    })

    return NextResponse.json(result, { status: result.action === 'added' ? 201 : 200 })

  } catch (error) {
    console.error('Favorites POST error:', error)

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

// DELETE /api/gallery/[token]/favorites/[photoId] - Remove specific favorite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; photoId?: string }> }
) {
  try {
    const { token } = await params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    const clientEmail = searchParams.get('clientEmail')

    if (!photoId) {
      return NextResponse.json({ error: 'photoId required' }, { status: 400 })
    }

    // Verify gallery access
    const share = await prisma.collectionShare.findUnique({
      where: { accessToken: token },
      select: { collectionId: true }
    })

    if (!share) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 404 })
    }

    // Build where clause for deletion
    const clientIdentifier = clientEmail || `anon_${generateClientIdentifier(request)}`
    const isAnonymous = !clientEmail

    const whereClause = isAnonymous 
      ? { photoId, anonymousId: clientIdentifier }
      : { photoId, clientEmail: clientEmail! }

    const deletedFavorite = await prisma.photoFavorite.deleteMany({
      where: {
        ...whereClause,
        photo: {
          collectionId: share.collectionId
        }
      }
    })

    if (deletedFavorite.count === 0) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }

    // Log the activity
    await prisma.viewActivity.create({
      data: {
        collectionId: share.collectionId,
        photoId,
        clientEmail: isAnonymous ? null : clientEmail,
        anonymousId: isAnonymous ? clientIdentifier : null,
        activityType: 'unfavorite',
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Favorite removed',
      deletedCount: deletedFavorite.count 
    })

  } catch (error) {
    console.error('Delete favorite error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}