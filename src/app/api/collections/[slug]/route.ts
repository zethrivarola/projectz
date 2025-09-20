import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'
import fs from 'fs/promises'
import path from 'path'

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  visibility: string
  isStarred: boolean
  isFeatured: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  coverPhoto?: unknown
  design?: unknown
  ownerId: string
  [key: string]: unknown
}

interface Share {
  shareToken: string
  collectionId: string
  [key: string]: unknown
}

// GET /api/collections/[slug] - Get collection by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('Collection detail - Auth header:', authHeader ? 'Present' : 'Missing')
    console.log('Collection detail - Cookie:', cookieToken ? 'Present' : 'Missing')
    console.log('Collection detail - Slug:', slug)

    if (!token) {
      console.log('Collection detail - No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('Collection detail - Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`Fetching collection with slug: ${slug} for user: ${payload.email}`)

    // Look for collection in persistent storage
    const collectionsMap = await storage.getCollections()
    const collection = Array.from(collectionsMap.values()).find(c => c.slug === slug) as Collection | undefined

    if (!collection) {
      console.log(`Collection not found: ${slug}`)
      console.log(`Available collections: ${Array.from(collectionsMap.values()).map(c => c.slug).join(', ')}`)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check ownership
    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      console.log(`Access denied to collection: ${slug}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get real uploaded photos from persistent storage
    const photosMap = await storage.getPhotos()
    const photos = Array.from(photosMap.values())
      .filter(p => p.collectionId === collection.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)

    if (photos.length > 0) {
      console.log(`Found ${photos.length} uploaded photos for collection ${collection.slug}`)
    } else {
      console.log(`No photos found for collection ${collection.slug}`)
    }

    console.log(`Collection found: ${collection.title} with ${photos.length} photos`)

    // Add design settings logging
    if (collection.design) {
      console.log(`Design settings found for ${collection.slug}:`, collection.design)
    } else {
      console.log(`No design settings for ${collection.slug}`)
    }

    return NextResponse.json({
      collection: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        slug: collection.slug,
        visibility: collection.visibility,
        isStarred: collection.isStarred,
        isFeatured: collection.isFeatured,
        tags: collection.tags,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        coverPhoto: collection.coverPhoto,
        design: collection.design,
        _count: {
          photos: photos.length
        }
      },
      photos
    })

  } catch (error) {
    console.error('Collection detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[slug] - Delete collection and all its photos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`Delete request for collection: ${slug}`)

    if (!token) {
      console.log('Delete - No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('Delete - Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`Delete collection ${slug} for user: ${payload.email}`)

    // Get collections from storage
    const collectionsMap = await storage.getCollections()
    const collection = Array.from(collectionsMap.values()).find(c => c.slug === slug) as Collection | undefined

    if (!collection) {
      console.log(`Collection not found for deletion: ${slug}`)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check ownership
    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      console.log(`Access denied for deletion: ${slug}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all photos in this collection
    const photosMap = await storage.getPhotos()
    const collectionPhotos = Array.from(photosMap.values())
      .filter(p => p.collectionId === collection.id)  // Removed the type assertion

    console.log(`Found ${collectionPhotos.length} photos to delete with collection`)

    // Delete physical photo files from filesystem
    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
    let deletedFiles = 0

    for (const photo of collectionPhotos) {
      try {
        // Delete all variants of the photo
        const collectionDir = path.join(UPLOAD_DIR, collection.id)
        const filesToDelete = [
          path.join(collectionDir, 'thumbnails', `thumb_${photo.filename}`),
          path.join(collectionDir, 'web', `web_${photo.filename}`),
          path.join(collectionDir, 'originals', photo.filename)
        ]

        for (const filePath of filesToDelete) {
          try {
            await fs.unlink(filePath)
            console.log(`Deleted file: ${filePath}`)
            deletedFiles++
          } catch (error) {
            // File might not exist, continue
            console.log(`Could not delete file: ${filePath}`)
          }
        }

        // Delete photo from storage
        await storage.deletePhoto(photo.id)
        console.log(`Deleted photo record: ${photo.filename}`)

      } catch (error) {
        console.error(`Error deleting photo ${photo.filename}:`, error)
      }
    }

    // Try to delete collection directory if empty
    try {
      const collectionDir = path.join(UPLOAD_DIR, collection.id)
      const subdirs = ['thumbnails', 'web', 'originals']
      
      for (const subdir of subdirs) {
        try {
          await fs.rmdir(path.join(collectionDir, subdir))
        } catch (error) {
          // Directory might not be empty or not exist
        }
      }
      
      await fs.rmdir(collectionDir)
      console.log(`Deleted collection directory: ${collectionDir}`)
    } catch (error) {
      console.log(`Could not delete collection directory (may not be empty)`)
    }

    // Delete any associated share links
    const sharesMap = await storage.getShares()
    const collectionShares = Array.from(sharesMap.values())
      .filter(share => share.collectionId === collection.id) as Share[]

    for (const share of collectionShares) {
      await storage.deleteShare(share.shareToken)
      console.log(`Deleted share link: ${share.shareToken}`)
    }

    // Finally, delete the collection itself
    await storage.deleteCollection(collection.id)
    console.log(`Deleted collection: ${collection.title}`)

    console.log(`Successfully deleted collection "${collection.title}" with ${collectionPhotos.length} photos and ${deletedFiles} files`)

    return NextResponse.json({
      success: true,
      message: `Collection "${collection.title}" and all associated data has been deleted`,
      deletedPhotos: collectionPhotos.length,
      deletedFiles: deletedFiles,
      deletedShares: collectionShares.length
    })

  } catch (error) {
    console.error('Collection deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}