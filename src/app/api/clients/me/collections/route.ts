import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectionToApiResponse } from '@/lib/types'

/**
 * GET /api/clients/me/collections
 * Obtiene todas las colecciones del cliente logueado
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET Client collections')

    // Authenticate
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verificar que sea un CLIENT
    if (payload.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Only clients can access this endpoint' }, { status: 403 })
    }

    // Obtener colecciones donde ownerId = userId del cliente
    const collections = await prisma.collection.findMany({
      where: {
        ownerId: payload.userId
      },
      include: {
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true
          }
        },
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        },
        photos: {
          select: {
            fileSize: true
          }
        },
        _count: {
          select: {
            photos: true
          }
        }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Transformar a API response
    const collectionsWithSize = collections.map(collection => {
      const totalSizeBytes = collection.photos.reduce(
        (sum, photo) => sum + photo.fileSize,
        BigInt(0)
      )

      return collectionToApiResponse({
        ...collection,
        totalSizeBytes
      })
    })

    console.log(`✅ Found ${collectionsWithSize.length} collections for client ${payload.userId}`)

    return NextResponse.json({
      collections: collectionsWithSize
    })

  } catch (error) {
    console.error('❌ GET Client collections error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
