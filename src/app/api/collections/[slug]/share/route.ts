import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { storage } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

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

    // Get the share settings from request body
    const { visibility, password, expiresAt, message } = await request.json()

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

    // Generate unique share token
    const shareToken = uuidv4()

    // Create share record
    const shareRecord = {
      id: uuidv4(),
      shareToken,
      collectionId: collection.id,
      collectionSlug: collection.slug,
      visibility: visibility || 'public',
      password: password ? await AuthService.hashPassword(password) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      message: message || '',
      createdAt: new Date(),
      createdBy: payload.userId,
      accessCount: 0,
      lastAccessedAt: null
    }

    // Save share record to storage
    await storage.setShare(shareToken, shareRecord)

    console.log(`✅ Share link created for collection: ${collection.title}`)

    // Return response matching what the dialog component expects
    return NextResponse.json({
      success: true,
      accessToken: shareToken,  // Changed from 'shareToken' to 'accessToken'
      shareUrl: `/gallery/${shareToken}`,
      expiresAt: shareRecord.expiresAt,
      createdAt: shareRecord.createdAt
    })

  } catch (error) {
    console.error('❌ Share creation error:', error)
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

    // Get existing share links for this collection
    const sharesMap = await storage.getShares()
    const collectionShares = Array.from(sharesMap.values()).filter(
      share => share.collectionId === collection.id
    )

    // Return the most recent share if it exists
    const mostRecentShare = collectionShares.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]

    if (mostRecentShare) {
      return NextResponse.json({
        share: {
          accessToken: mostRecentShare.shareToken,  // Changed to match dialog expectations
          shareUrl: `/gallery/${mostRecentShare.shareToken}`,
          expiresAt: mostRecentShare.expiresAt,
          createdAt: mostRecentShare.createdAt
        }
      })
    }

    return NextResponse.json({
      share: null
    })

  } catch (error) {
    console.error('❌ Share retrieval error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

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

    // Get existing share links for this collection and delete them
    const sharesMap = await storage.getShares()
    const collectionShares = Array.from(sharesMap.values()).filter(
      share => share.collectionId === collection.id
    )

    // Delete all shares for this collection
    for (const share of collectionShares) {
      await storage.deleteShare(share.shareToken)
    }

    console.log(`🗑️ Deleted ${collectionShares.length} share links for collection: ${collection.title}`)

    return NextResponse.json({
      success: true,
      deletedCount: collectionShares.length
    })

  } catch (error) {
    console.error('❌ Share deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}