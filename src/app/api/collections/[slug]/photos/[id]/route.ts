import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'
import fs from 'fs/promises'
import path from 'path'

// DELETE /api/collections/[slug]/photos/[id] - Delete single or multiple photos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    // Properly await and destructure params
    const resolvedParams = await params
    const { slug, id } = resolvedParams
    
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

    // Check if this is a bulk delete (ids in request body) or single delete (id in params)
    const body = await request.json().catch(() => null)
    const photoIds = body?.photoIds || [id]  // Fixed: use destructured 'id' instead of 'params.id'

    console.log(`Delete photos request - Collection: ${slug}, Photos: ${photoIds.length}`)  // Fixed: use destructured 'slug' instead of 'params.slug'

    // Get collection
    const collectionsMap = await storage.getCollections()
    const collection = Array.from(collectionsMap.values()).find(c => c.slug === slug)  // Fixed: use destructured 'slug' instead of 'params.slug'

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check ownership
    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const photosMap = await storage.getPhotos()
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
    const collectionDir = path.join(UPLOAD_DIR, collection.id)
    
    let deletedCount = 0
    let deletedFiles = 0
    let wasCoverPhotoDeleted = false

    for (const photoId of photoIds) {
      const photo = photosMap.get(photoId)
      
      if (!photo) {
        console.log(`Photo not found: ${photoId}`)
        continue
      }

      if (photo.collectionId !== collection.id) {
        console.log(`Photo ${photoId} does not belong to collection ${collection.id}`)
        continue
      }

      // Delete physical files
      const filesToDelete = [
        path.join(collectionDir, 'thumbnails', `thumb_${photo.filename}`),
        path.join(collectionDir, 'web', `web_${photo.filename}`),
        path.join(collectionDir, 'originals', photo.filename)
      ]

      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath)
          deletedFiles++
        } catch (error) {
          console.log(`Could not delete file: ${filePath}`)
        }
      }

      // Check if this was the cover photo
      if (collection.coverPhoto?.id === photo.id) {
        wasCoverPhotoDeleted = true
      }

      // Delete photo from storage
      await storage.deletePhoto(photo.id)
      deletedCount++
      console.log(`Deleted photo: ${photo.filename}`)
    }

    // If cover photo was deleted, remove it from collection
    if (wasCoverPhotoDeleted) {
      await storage.updateCollection(collection.id, {
        coverPhoto: undefined
      })
    }

    console.log(`Successfully deleted ${deletedCount} photos`)

    return NextResponse.json({
      success: true,
      message: `${deletedCount} photo${deletedCount !== 1 ? 's' : ''} deleted successfully`,
      deletedCount,
      deletedFiles,
      coverPhotoRemoved: wasCoverPhotoDeleted
    })

  } catch (error) {
    console.error('Photo deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete photos' },
      { status: 500 }
    )
  }
}