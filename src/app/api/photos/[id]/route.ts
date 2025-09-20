import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Fixed: changed from 'slug' to 'id'
) {
  try {
    // Fixed: await params and destructure id correctly
    const resolvedParams = await params
    const { id } = resolvedParams  // Fixed: changed from 'slug' to 'id'
    
    // Check authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const photoId = id  // Fixed: use destructured 'id' instead of 'params.id'

    console.log(`🗑️ Deleting photo: ${photoId} for user: ${payload.email}`)

    // Find the photo
    const photosMap = await storage.getPhotos()
    const photo = photosMap.get(photoId)
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Check if user has permission to delete this photo
    const collectionsMap = await storage.getCollections()
    const collection = collectionsMap.get(photo.collectionId)
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the photo from storage
    await storage.deletePhoto(photoId)

    // Update collection photo count
    collection.photoCount = Math.max(0, (collection.photoCount || 0) - 1)

    // If this was the cover photo, set the next available photo as cover
    if (collection.coverPhoto?.id === photoId) {
      // Find remaining photos in this collection
      const updatedPhotosMap = await storage.getPhotos()
      const remainingPhotos = Array.from(updatedPhotosMap.values())
        .filter(p => p.collectionId === photo.collectionId)
        .sort((a, b) => a.orderIndex - b.orderIndex)

      if (remainingPhotos.length > 0) {
        // Set first remaining photo as cover
        const newCoverPhoto = remainingPhotos[0]
        collection.coverPhoto = {
          id: newCoverPhoto.id,
          thumbnailUrl: newCoverPhoto.thumbnailUrl,
          webUrl: newCoverPhoto.webUrl
        }
        console.log(`🖼️ Set new cover photo: ${newCoverPhoto.id}`)
      } else {
        // No photos left, remove cover
        collection.coverPhoto = undefined
        console.log(`🖼️ Removed cover photo - no photos remaining`)
      }
    }

    // Save updated collection
    await storage.setCollection(photo.collectionId, collection)

    console.log(`✅ Photo ${photoId} deleted successfully`)

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
      photoId
    })

  } catch (error) {
    console.error('❌ Photo delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}