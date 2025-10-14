import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SetCoverPhotoSchema = z.object({
  photoId: z.string().uuid()
})

// PUT method - alias for POST
export async function PUT(
  request: NextRequest,
  params: { params: Promise<{ slug: string }> }
) {
  return POST(request, params)
}

// POST /api/collections/[slug]/cover - Set cover photo for collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`📸 SET Cover Photo for collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { photoId } = SetCoverPhotoSchema.parse(body)

    // Get collection to verify ownership
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true }
    })

    if (!collection) {
      console.log(`❌ Collection not found: ${slug}`)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify photo exists and belongs to this collection
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: {
        id: true,
        collectionId: true,
        thumbnailUrl: true,
        webUrl: true
      }
    })

    if (!photo) {
      console.log(`❌ Photo not found: ${photoId}`)
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (photo.collectionId !== collection.id) {
      console.log(`❌ Photo does not belong to collection`)
      return NextResponse.json({ error: 'Photo does not belong to this collection' }, { status: 400 })
    }

    // Update collection with new cover photo
    const updatedCollection = await prisma.collection.update({
      where: { id: collection.id },
      data: {
        coverPhotoId: photoId,
        updatedAt: new Date()
      },
      include: {
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true
          }
        }
      }
    })

    console.log(`✅ Cover photo set successfully`)

    return NextResponse.json({
      success: true,
      message: 'Cover photo updated successfully',
      coverPhoto: updatedCollection.coverPhoto
    })

  } catch (error) {
    console.error('❌ SET Cover Photo error:', error)

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

// DELETE /api/collections/[slug]/cover - Remove cover photo from collection
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

    console.log(`🗑️ REMOVE Cover Photo from collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get collection to verify ownership
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Remove cover photo
    await prisma.collection.update({
      where: { id: collection.id },
      data: {
        coverPhotoId: null,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Cover photo removed`)

    return NextResponse.json({
      success: true,
      message: 'Cover photo removed successfully'
    })

  } catch (error) {
    console.error('❌ REMOVE Cover Photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}