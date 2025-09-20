import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  console.log('PUT /api/collections/[slug]/cover endpoint called');
  
  try {
    const { slug } = await params

    console.log(`Cover photo update request for collection: ${slug}`)

    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    console.log('Cookie token:', cookieToken ? 'Present' : 'Missing')

    if (!token) {
      console.log('No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`Authenticated user: ${payload.email}`)

    // Get the photo ID from request body
    const { photoId } = await request.json()
    console.log(`Requested photo ID: ${photoId}`)

    if (!photoId) {
      console.log('No photo ID provided')
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 })
    }

    // Get collections and photos from storage
    const collectionsMap = await storage.getCollections()
    const photosMap = await storage.getPhotos()

    console.log(`Total collections in storage: ${collectionsMap.size}`)
    console.log(`Total photos in storage: ${photosMap.size}`)

    // Find collection by slug
    const collection = Array.from(collectionsMap.values()).find(c => c.slug === slug)
    if (!collection) {
      console.log(`Collection not found with slug: ${slug}`)
      console.log(`Available collections: ${Array.from(collectionsMap.values()).map(c => c.slug).join(', ')}`)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    console.log(`Found collection: ${collection.title} (ID: ${collection.id})`)

    // Check ownership
    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      console.log(`Access denied. Collection owner: ${collection.ownerId}, User: ${payload.userId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the photo to set as cover
    const photo = photosMap.get(photoId)
    if (!photo) {
      console.log(`Photo not found with ID: ${photoId}`)
      console.log(`Available photo IDs: ${Array.from(photosMap.keys()).join(', ')}`)
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    console.log(`Found photo: ${photo.filename} (Collection: ${photo.collectionId})`)

    // Verify photo belongs to this collection
    if (photo.collectionId !== collection.id) {
      console.log(`Photo belongs to collection ${photo.collectionId}, but trying to set for ${collection.id}`)
      return NextResponse.json({ error: 'Photo does not belong to this collection' }, { status: 400 })
    }

    // Create cover photo object
    const coverPhoto = {
      id: photo.id,
      thumbnailUrl: photo.thumbnailUrl,
      webUrl: photo.webUrl
    }

    console.log(`Updating collection with cover photo:`, coverPhoto)

    // Use the existing updateCollection method instead of saveCollections
    await storage.updateCollection(collection.id, {
      coverPhoto: coverPhoto
    })

    console.log(`Cover photo set successfully for collection: ${collection.title}`)

    return NextResponse.json({
      success: true,
      coverPhoto: coverPhoto
    })

  } catch (error) {
    console.error('Cover photo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}