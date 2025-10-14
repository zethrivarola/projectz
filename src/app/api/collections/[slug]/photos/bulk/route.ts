import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const BulkDeleteSchema = z.object({
  photoIds: z.array(z.string()).min(1)
})

// DELETE /api/collections/[slug]/photos/bulk - Delete multiple photos
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

    console.log(`🗑️ BULK DELETE from collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { photoIds } = BulkDeleteSchema.parse(body)

    // Get collection to verify ownership
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true, coverPhotoId: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get photos to verify they belong to this collection
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        collectionId: collection.id
      },
      select: {
        id: true,
        filename: true,
        originalFilename: true
      }
    })

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos found to delete' }, { status: 404 })
    }

    // Delete physical files
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const collectionDir = path.join(uploadDir, collection.id)
    
    for (const photo of photos) {
      const filesToDelete = [
        path.join(collectionDir, 'original', photo.filename),
        path.join(collectionDir, 'thumbnails', `thumb_${photo.filename.replace(/\.[^.]+$/, '.jpg')}`),
        path.join(collectionDir, 'web', `web_${photo.filename.replace(/\.[^.]+$/, '.jpg')}`),
        path.join(collectionDir, 'high-res', `highres_${photo.filename.replace(/\.[^.]+$/, '.jpg')}`)
      ]

      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath)
        } catch (error) {
          console.log(`⚠️ Could not delete file: ${filePath}`)
        }
      }
    }

    // Use transaction to delete photos and update collection
    const result = await prisma.$transaction(async (tx) => {
      // Delete photos
      const deleteResult = await tx.photo.deleteMany({
        where: { id: { in: photoIds } }
      })

      // If cover photo was deleted, update collection
      if (photoIds.includes(collection.coverPhotoId || '')) {
        const remainingPhoto = await tx.photo.findFirst({
          where: { collectionId: collection.id },
          orderBy: { orderIndex: 'asc' },
          select: { id: true }
        })

        await tx.collection.update({
          where: { id: collection.id },
          data: {
            coverPhotoId: remainingPhoto?.id || null,
            updatedAt: new Date()
          }
        })
      }

      return deleteResult
    })

    console.log(`✅ Bulk deleted ${result.count} photos`)

    return NextResponse.json({ 
      success: true,
      message: 'Photos deleted successfully',
      deletedCount: result.count
    })

  } catch (error) {
    console.error('❌ BULK DELETE error:', error)

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