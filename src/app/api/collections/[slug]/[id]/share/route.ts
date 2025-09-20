import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'
import crypto from 'crypto'

const ShareCollectionSchema = z.object({
  visibility: z.enum(['public', 'password_protected']),
  password: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  expiresAt: z.string().datetime().optional(),
  message: z.string().optional(),
})

// GET /api/collections/[id]/share - Get existing share info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { id, slug } = await params  // AGREGAR ESTA LÍNEA

    // Verify collection ownership
    const collection = await prisma.collection.findFirst({
      where: {
        id: id,  // CAMBIAR params.id por id
        ownerId: payload.userId
      }
    })
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    // Get existing share
    const share = await prisma.collectionShare.findFirst({
      where: {
        collectionId: id,  // CAMBIAR params.id por id
        sharedBy: payload.userId
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!share) {
      return NextResponse.json({ share: null })
    }

    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'

    return NextResponse.json({
      share: {
        accessToken: share.accessToken,
        shareUrl: `${baseUrl}/gallery/${share.accessToken}`,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
        recipientEmail: share.recipientEmail,
        accessedAt: share.accessedAt,
      }
    })

  } catch (error) {
    console.error('Share GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/collections/[id]/share - Create share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { id, slug } = await params
    
    const body = await request.json()
    const data = ShareCollectionSchema.parse(body)
    // Verify collection ownership
    const collection = await prisma.collection.findFirst({
      where: {
        id: id,
        ownerId: payload.userId
      }
    })
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    // Delete existing shares for this collection
    await prisma.collectionShare.deleteMany({
      where: {
        collectionId: id,
        sharedBy: payload.userId
      }
    })
    // Generate secure access token
    const accessToken = crypto.randomBytes(32).toString('hex')
    // Hash password if provided
    let passwordHash = null
    if (data.visibility === 'password_protected' && data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }
    // Update collection visibility and password
    await prisma.collection.update({
      where: { id: id },
      data: {
        visibility: data.visibility,
        passwordHash,
      }
    })
    // Create new share record
    const share = await prisma.collectionShare.create({
      data: {
        collectionId: id,
        sharedBy: payload.userId,
        recipientEmail: data.recipientEmail || null,
        accessToken,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }
    })
    const baseUrl = request.headers.get('origin') || 'http://localhost:3000'
    return NextResponse.json({
      accessToken: share.accessToken,
      shareUrl: `${baseUrl}/gallery/${share.accessToken}`,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
    })
  } catch (error) {
    console.error('Share POST error:', error)
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

// DELETE /api/collections/[id]/share - Delete share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { id, slug } = await params
    
    // Verify collection ownership
    const collection = await prisma.collection.findFirst({
      where: {
        id: id,
        ownerId: payload.userId
      }
    })
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    
    // Delete all shares for this collection
    await prisma.collectionShare.deleteMany({
      where: {
        collectionId: id,
        sharedBy: payload.userId
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Share DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
