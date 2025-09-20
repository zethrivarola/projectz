import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    console.log(`🎨 Design update request for collection: ${slug}`)

    // Get token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    if (!token) {
      console.log('⚠️ No authentication token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      console.log('⚠️ Invalid authentication token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log(`✅ Authenticated user: ${payload.email}`)

    // Get the design data from request body
    const { design } = await request.json()
    console.log(`📝 Design data received:`, JSON.stringify(design, null, 2))

    if (!design) {
      console.log('⚠️ No design data provided')
      return NextResponse.json({ error: 'Design data is required' }, { status: 400 })
    }

    // Get collections from storage
    const collectionsMap = await storage.getCollections()
    console.log(`📂 Total collections in storage: ${collectionsMap.size}`)

    // Find collection by slug
    const collection = Array.from(collectionsMap.values()).find(c => c.slug === slug)
    if (!collection) {
      console.log(`⚠️ Collection not found with slug: ${slug}`)
      console.log(`Available collections: ${Array.from(collectionsMap.values()).map(c => c.slug).join(', ')}`)
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    console.log(`📁 Found collection: ${collection.title} (ID: ${collection.id})`)

    // Check ownership
    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      console.log(`🚫 Access denied. Owner: ${collection.ownerId}, User: ${payload.userId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update collection with new design data
    const updatedCollection = {
      ...collection,
      design: design,
      updatedAt: new Date()
    }

    console.log(`💾 Saving updated collection with design:`, JSON.stringify(updatedCollection.design, null, 2))

    // Use updateCollection method instead of saveCollections
    await storage.updateCollection(collection.id, updatedCollection)

    console.log(`✅ Design settings saved successfully for collection: ${collection.title}`)

    // Verify the save worked by reading it back
    const verifyMap = await storage.getCollections()
    const verifyCollection = verifyMap.get(collection.id)
    console.log(`🔍 Verification - saved design:`, JSON.stringify(verifyCollection?.design, null, 2))

    return NextResponse.json({
      success: true,
      collection: updatedCollection,
      design: updatedCollection.design
    })

  } catch (error) {
    console.error('❌ Design save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    console.log(`📖 Design get request for collection: ${slug}`)

    // Get token from Authorization header or cookies
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

    // Get collections from storage
    const collectionsMap = await storage.getCollections()

    // Find collection by slug
    const collection = Array.from(collectionsMap.values()).find(c => c.slug === slug)
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check ownership
    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log(`✅ Retrieved design for ${collection.title}:`, JSON.stringify(collection.design, null, 2))

    return NextResponse.json({
      success: true,
      design: collection.design || null,
      collection: collection
    })

  } catch (error) {
    console.error('❌ Design get error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}