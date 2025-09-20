import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@/lib/storage'

const CreateCollectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private', 'password_protected']).default('private'),
  password: z.string().optional(),
  tags: z.array(z.string()).default([]),
  dateTaken: z.string().datetime().optional(),
})

// GET /api/collections - List collections
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 Collections GET - Auth header:', authHeader ? 'Present' : 'Missing')
    console.log('🔍 Collections GET - Cookie:', cookieToken ? 'Present' : 'Missing')
    console.log('🔍 Collections GET - Using token:', token ? 'Present' : 'Missing')

    if (!token) {
      console.log('❌ Collections GET - No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('❌ Collections GET - Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`📋 Fetching collections for user: ${payload.email}`)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const starred = searchParams.get('starred') === 'true'

    // Get collections and photos from persistent storage
    const collectionsMap = await storage.getCollections()
    const photosMap = await storage.getPhotos()

    // Calculate actual photo counts for each collection
    const collectionPhotoCount = new Map<string, number>()
    for (const photo of photosMap.values()) {
      const currentCount = collectionPhotoCount.get(photo.collectionId) || 0
      collectionPhotoCount.set(photo.collectionId, currentCount + 1)
    }

    console.log(`📸 Photo counts per collection:`, Object.fromEntries(collectionPhotoCount))

    // Filter collections by user ownership and search criteria
    const collections = Array.from(collectionsMap.values()).filter(collection => {
      // Check ownership
      if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
        return false
      }

      // Check search
      if (search && !collection.title.toLowerCase().includes(search.toLowerCase()) &&
          !collection.description?.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Check starred filter
      if (starred && !collection.isStarred) {
        return false
      }

      return true
    })

    // Sort by creation date (newest first)
    collections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const total = collections.length
    const startIndex = (page - 1) * limit
    const paginatedCollections = collections.slice(startIndex, startIndex + limit)

    // Transform to API format with actual photo counts INCLUDING design data
    const formattedCollections = paginatedCollections.map(collection => {
      const actualPhotoCount = collectionPhotoCount.get(collection.id) || 0
      return {
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
        dateTaken: collection.dateTaken,
        coverPhoto: collection.coverPhoto,
        design: collection.design,
        _count: {
          photos: actualPhotoCount
        }
      }
    })

    console.log(`✅ Returning ${formattedCollections.length} collections`)
    
    // Debug: Log collections with design data
    const collectionsWithDesign = formattedCollections.filter(c => c.design)
    console.log(`🎨 Collections with design settings: ${collectionsWithDesign.length}`)

    return NextResponse.json({
      collections: formattedCollections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('❌ Collections GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/collections - Create collection
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log('🔍 Collections POST - Auth header:', authHeader ? 'Present' : 'Missing')
    console.log('🔍 Collections POST - Cookie:', cookieToken ? 'Present' : 'Missing')
    console.log('🔍 Collections POST - Using token:', token ? 'Present' : 'Missing')

    if (!token) {
      console.log('❌ Collections POST - No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('❌ Collections POST - Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = CreateCollectionSchema.parse(body)

    console.log(`🔥 Creating new collection: "${data.title}" for user: ${payload.email}`)

    // Get existing collections to check for slug conflicts
    const collectionsMap = await storage.getCollections()

    // Generate unique ID and slug
    const collectionId = uuidv4()
    let slug = AuthService.generateSlug(data.title)
    let counter = 1
    while (Array.from(collectionsMap.values()).some(c => c.slug === slug)) {
      slug = `${AuthService.generateSlug(data.title)}-${counter}`
      counter++
    }

    // Hash password if provided
    let passwordHash = null
    if (data.visibility === 'password_protected' && data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }

    // Create new collection with default design settings
    const newCollection = {
      id: collectionId,
      title: data.title,
      description: data.description || '',
      slug,
      ownerId: payload.userId,
      visibility: data.visibility,
      passwordHash,
      isStarred: false,
      isFeatured: false,
      tags: data.tags,
      dateTaken: data.dateTaken ? new Date(data.dateTaken) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      photoCount: 0,
      coverPhoto: null as { id: string; thumbnailUrl: string; webUrl: string } | null,
      // Add default design settings for new collections
      design: {
        coverLayout: 'center',
        typography: {
          titleFont: 'Playfair Display',
          titleSize: 48,
          titleColor: '#ffffff'
        },
        colors: {
          background: '#ffffff',
          accent: '#000000'
        },
        grid: {
          columns: 4,
          spacing: 12
        },
        coverFocus: {
          x: 50,
          y: 50
        }
      }
    }

    // Save to persistent storage so it's accessible by other routes
    await storage.setCollection(collectionId, newCollection)

    // Format response including design data
    const response = {
      id: newCollection.id,
      title: newCollection.title,
      description: newCollection.description,
      slug: newCollection.slug,
      visibility: newCollection.visibility,
      isStarred: newCollection.isStarred,
      isFeatured: newCollection.isFeatured,
      tags: newCollection.tags,
      dateTaken: newCollection.dateTaken,
      createdAt: newCollection.createdAt,
      updatedAt: newCollection.updatedAt,
      coverPhoto: newCollection.coverPhoto,
      design: newCollection.design,
      _count: {
        photos: newCollection.photoCount
      }
    }

    console.log(`✅ Collection "${data.title}" created successfully with ID: ${collectionId}`)

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('❌ Collections POST error:', error)

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