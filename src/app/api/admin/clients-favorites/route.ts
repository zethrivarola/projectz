import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'

// GET /api/admin/clients-favorites - Get all client favorites for authenticated user's collections
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
if (!token) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const auth = AuthService.verifyToken(token)
if (!auth) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
}


    const userId = auth.userId
    const { searchParams } = new URL(request.url)
    const collectionId = searchParams.get('collectionId')
    const clientEmail = searchParams.get('clientEmail')
    const sortBy = searchParams.get('sortBy') || 'recent' // 'recent' | 'popular'

    // Build where clause for user's collections
    const collectionsWhere: {
  ownerId: string
  id?: string
} = {
      ownerId: userId
    }

    if (collectionId) {
      collectionsWhere.id = collectionId
    }

    // Get user's collections
    const collections = await prisma.collection.findMany({
      where: collectionsWhere,
      select: { id: true, title: true, slug: true }
    })

    if (collections.length === 0) {
      return NextResponse.json({
        favorites: [],
        analytics: {
          totalFavorites: 0,
          uniquePhotos: 0,
          uniqueClients: 0,
          collections: 0,
          byCollection: []
        }
      })
    }

    const collectionIds = collections.map(c => c.id)

    // Build favorite query
    const favoriteWhere: {
  photo?: {
    collectionId?: {
      in: string[]
    }
  }
  clientEmail?: string
} = {
      photo: {
        collectionId: {
          in: collectionIds
        }
      }
    }

    if (clientEmail) {
      favoriteWhere.clientEmail = clientEmail
    }

    // Get all favorites
    const favorites = await prisma.photoFavorite.findMany({
      where: favoriteWhere,
      include: {
        photo: {
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            thumbnailUrl: true,
            webUrl: true,
            collectionId: true,
            orderIndex: true,
          }
        }
      },
      orderBy: sortBy === 'popular' 
        ? undefined 
        : { createdAt: 'desc' }
    })

    // Calculate statistics
    const uniqueClients = new Set(favorites.map(f => f.clientEmail))
    const uniquePhotos = new Set(favorites.map(f => f.photoId))
    
    // Count by collection
    const byCollection = collections.map(collection => {
      const collectionFavorites = favorites.filter(
        f => f.photo.collectionId === collection.id
      )
      return {
        collectionId: collection.id,
        collectionTitle: collection.title,
        collectionSlug: collection.slug,
        totalFavorites: collectionFavorites.length,
        uniquePhotos: new Set(collectionFavorites.map(f => f.photoId)).size,
        uniqueClients: new Set(collectionFavorites.map(f => f.clientEmail)).size,
      }
    }).filter(c => c.totalFavorites > 0)

    // Get most favorited photos
    const photoFavoriteCounts = new Map<string, number>()
    favorites.forEach(fav => {
      photoFavoriteCounts.set(fav.photoId, (photoFavoriteCounts.get(fav.photoId) || 0) + 1)
    })

    const mostFavoritedPhotos = favorites
      .filter((fav, idx, arr) => arr.findIndex(f => f.photoId === fav.photoId) === idx)
      .sort((a, b) => (photoFavoriteCounts.get(b.photoId) || 0) - (photoFavoriteCounts.get(a.photoId) || 0))
      .slice(0, 10)
      .map(fav => ({
        ...fav,
        favoriteCount: photoFavoriteCounts.get(fav.photoId) || 0
      }))

    // Get client activity
    const clientActivity = Array.from(uniqueClients).map(email => {
      const clientFavorites = favorites.filter(f => f.clientEmail === email)
      return {
        clientEmail: email,
        totalFavorites: clientFavorites.length,
        collections: Array.from(
          new Set(clientFavorites.map(f => f.photo.collectionId))
        ).length,
        lastFavoritedAt: clientFavorites[0]?.createdAt || null
      }
    }).sort((a, b) => new Date(b.lastFavoritedAt || 0).getTime() - new Date(a.lastFavoritedAt || 0).getTime())

    const response = {
      favorites: favorites.map(fav => ({
        id: fav.id,
        photoId: fav.photoId,
        clientEmail: fav.clientEmail,
        notes: fav.notes,
        createdAt: fav.createdAt,
        photo: fav.photo,
        favoriteCount: photoFavoriteCounts.get(fav.photoId) || 0
      })),
      analytics: {
        totalFavorites: favorites.length,
        uniquePhotos: uniquePhotos.size,
        uniqueClients: uniqueClients.size,
        collections: collections.length,
        byCollection,
        mostFavoritedPhotos,
        clientActivity
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Clients favorites GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}