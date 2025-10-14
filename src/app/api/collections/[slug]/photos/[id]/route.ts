import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

// DELETE /api/collections/[slug]/photos/[id] - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🗑️ DELETE Photo: ${id} from collection: ${slug}`)

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
      select: { id: true, ownerId: true, coverPhotoId: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get photo to verify it belongs to this collection
    const photo = await prisma.photo.findUnique({
      where: { id },
      select: {
        id: true,
        collectionId: true,
        filename: true,
        originalFilename: true
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (photo.collectionId !== collection.id) {
      return NextResponse.json({ error: 'Photo does not belong to this collection' }, { status: 400 })
    }

    // Delete physical files (optional, puede fallar sin detener el proceso)
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const collectionDir = path.join(uploadDir, collection.id)
    
    const filesToDelete = [
      path.join(collectionDir, 'original', photo.filename),
      path.join(collectionDir, 'thumbnails', `thumb_${photo.filename.replace(/\.[^.]+$/, '.jpg')}`),
      path.join(collectionDir, 'web', `web_${photo.filename.replace(/\.[^.]+$/, '.jpg')}`),
      path.join(collectionDir, 'high-res', `highres_${photo.filename.replace(/\.[^.]+$/, '.jpg')}`)
    ]

    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath)
        console.log(`🗑️ Deleted file: ${filePath}`)
      } catch (error) {
        console.log(`⚠️ Could not delete file: ${filePath}`)
      }
    }

    // Use transaction to delete photo and update collection if needed
    await prisma.$transaction(async (tx) => {
      // Delete the photo
      await tx.photo.delete({ where: { id } })

      // If this was the cover photo, clear it from collection
      if (collection.coverPhotoId === id) {
        // Find another photo to set as cover
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
    })

    console.log(`✅ Photo deleted: ${photo.originalFilename}`)

    return NextResponse.json({ 
  success: true,
  message: 'Photo deleted successfully',
  photoId: id
})

  } catch (error) {
    console.error('❌ DELETE Photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}