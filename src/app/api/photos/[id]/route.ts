import { NextRequest, NextResponse } from 'next/server'
import { AuthService, canAccessResource } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

// GET /api/photos/[id] - Get single photo details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 GET Photo: ${id}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get photo with collection info
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            slug: true,
            ownerId: true,
            owner: { select: { createdById: true } }
          }
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Check ownership
    const hasAccessGet = canAccessResource({ userRole: payload.role, userId: payload.userId, resourceOwnerId: photo.collection.ownerId ?? undefined, resourceOwnerCreatedBy: photo.collection.owner?.createdById ?? undefined })
    if (!hasAccessGet) {
    }

    console.log(`✅ Photo found: ${photo.originalFilename}`)

    return NextResponse.json({
      photo: {
        id: photo.id,
        filename: photo.filename,
        originalFilename: photo.originalFilename,
        fileSize: photo.fileSize.toString(),
        mimeType: photo.mimeType,
        width: photo.width,
        height: photo.height,
        isRaw: photo.isRaw,
        exifData: photo.exifData,
        focalPoint: photo.focalPoint,
        orderIndex: photo.orderIndex,
        processingStatus: photo.processingStatus,
        thumbnailUrl: photo.thumbnailUrl,
        webUrl: photo.webUrl,
        highResUrl: photo.highResUrl,
        originalUrl: photo.originalUrl,
        watermarkedUrl: photo.watermarkedUrl,
        createdAt: photo.createdAt,
        updatedAt: photo.updatedAt,
        collection: photo.collection
      }
    })

  } catch (error) {
    console.error('❌ GET Photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/photos/[id] - Delete photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🗑️ DELETE Photo: ${id}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get photo with collection info
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        collection: {
          select: {
            id: true,
            ownerId: true,
            coverPhotoId: true,
            owner: { select: { createdById: true } }
          }
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Check ownership
    const hasAccessDelete = canAccessResource({ userRole: payload.role, userId: payload.userId, resourceOwnerId: photo.collection.ownerId ?? undefined, resourceOwnerCreatedBy: photo.collection.owner?.createdById ?? undefined })
    if (!hasAccessDelete) {
    }

    // Delete physical files
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const collectionDir = path.join(uploadDir, photo.collectionId)
    
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

      // If this was the cover photo, update collection
      if (photo.collection.coverPhotoId === id) {
        const remainingPhoto = await tx.photo.findFirst({
          where: { collectionId: photo.collectionId },
          orderBy: { orderIndex: 'asc' },
          select: { id: true }
        })

        await tx.collection.update({
          where: { id: photo.collectionId },
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