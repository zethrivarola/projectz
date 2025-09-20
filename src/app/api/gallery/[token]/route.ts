import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Get share record by token
    const sharesMap = await storage.getShares()
    const shareRecord = sharesMap.get(token)

    if (!shareRecord) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    // Check if share has expired
    if (shareRecord.expiresAt && new Date() > shareRecord.expiresAt) {
      return NextResponse.json({ error: 'Gallery link has expired' }, { status: 410 })
    }

    // Check if password is required
    if (shareRecord.password) {
      return NextResponse.json({
        requiresPassword: true,
        message: 'This gallery is password protected'
      }, { status: 401 })
    }

    // Get collection and photos
    const collectionsMap = await storage.getCollections()
    const photosMap = await storage.getPhotos()

    const collection = collectionsMap.get(shareRecord.collectionId)
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get photos for this collection
    const photos = Array.from(photosMap.values())
      .filter(photo => photo.collectionId === shareRecord.collectionId)
      .sort((a, b) => a.orderIndex - b.orderIndex)

    // Update access count and last accessed time
    shareRecord.accessCount += 1
    shareRecord.lastAccessedAt = new Date()
    await storage.setShare(token, shareRecord)

    console.log(`📱 Public gallery accessed: ${collection.title} (${photos.length} photos)`)

    return NextResponse.json({
      shareToken: token,
      collection: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        slug: collection.slug,
        coverPhoto: collection.coverPhoto,
        design: collection.design,
        _count: {
          photos: photos.length
        }
      },
      photos: photos.map(photo => ({
        id: photo.id,
        filename: photo.filename,
        originalFilename: photo.originalFilename,
        thumbnailUrl: photo.thumbnailUrl,
        webUrl: photo.webUrl,
        originalUrl: photo.originalUrl
      })),
      isExpired: false,
      requiresPassword: false
    })

  } catch (error) {
    console.error('❌ Gallery access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { password } = await request.json()

    // Get share record by token
    const sharesMap = await storage.getShares()
    const shareRecord = sharesMap.get(token)

    if (!shareRecord) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    // Check if share has expired
    if (shareRecord.expiresAt && new Date() > shareRecord.expiresAt) {
      return NextResponse.json({ error: 'Gallery link has expired' }, { status: 410 })
    }

    // Verify password
    if (!shareRecord.password) {
      return NextResponse.json({ error: 'Password not required' }, { status: 400 })
    }

    const isValidPassword = await AuthService.verifyPassword(password, shareRecord.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    // Get collection and photos
    const collectionsMap = await storage.getCollections()
    const photosMap = await storage.getPhotos()

    const collection = collectionsMap.get(shareRecord.collectionId)
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get photos for this collection
    const photos = Array.from(photosMap.values())
      .filter(photo => photo.collectionId === shareRecord.collectionId)
      .sort((a, b) => a.orderIndex - b.orderIndex)

    // Update access count and last accessed time
    shareRecord.accessCount += 1
    shareRecord.lastAccessedAt = new Date()
    await storage.setShare(token, shareRecord)

    console.log(`🔓 Password-protected gallery accessed: ${collection.title}`)

    return NextResponse.json({
      shareToken: token,
      collection: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        slug: collection.slug,
        coverPhoto: collection.coverPhoto,
        design: collection.design,
        _count: {
          photos: photos.length
        }
      },
      photos: photos.map(photo => ({
        id: photo.id,
        filename: photo.filename,
        originalFilename: photo.originalFilename,
        thumbnailUrl: photo.thumbnailUrl,
        webUrl: photo.webUrl,
        originalUrl: photo.originalUrl
      })),
      isExpired: false,
      requiresPassword: false
    })

  } catch (error) {
    console.error('❌ Gallery password verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
