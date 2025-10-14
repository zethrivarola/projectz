import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import crypto from 'crypto'

const CreateShareSchema = z.object({
  allowDownload: z.boolean().default(true),
  allowFavorites: z.boolean().default(true),
  allowComments: z.boolean().default(false),
  password: z.string().optional(),
  expiresInDays: z.number().optional(),
  watermarkEnabled: z.boolean().default(false),
  customMessage: z.string().optional(),
})

// POST /api/collections/[slug]/share - Create share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔗 Creating share link for collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = CreateShareSchema.parse(body)

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true, title: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate unique access token
    const accessToken = crypto.randomBytes(32).toString('hex')

    // Hash password if provided
    let passwordHash = null
    if (data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }

    // Calculate expiry date
    let expiresAt = null
    if (data.expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays)
    }

      // Create share link
const shareLink = await prisma.enhancedShareLink.create({
  data: {
    collectionId: collection.id,
    createdById: payload.userId,
    token: accessToken,
    title: `${collection.title} - Shared Gallery`,
    description: data.customMessage || null,
    isActive: true,
    passwordHash: passwordHash,
    allowDownload: data.allowDownload,
    allowComments: data.allowComments,
    allowFavorites: data.allowFavorites,
    expiresAt,
    recipientEmails: [],
    customMessage: data.customMessage || null,
    trackingEnabled: true,
    requirePin: false,
    downloadPin: null,
  }
})

    console.log(`✅ Share link created: ${accessToken}`)

    // Generate full URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/gallery/${accessToken}`

    return NextResponse.json({
      success: true,
      shareLink: {
        id: shareLink.id,
        accessToken: shareLink.token,
        shareUrl,
        allowDownload: shareLink.allowDownload,
        allowFavorites: shareLink.allowFavorites,
        allowComments: shareLink.allowComments,
        expiresAt: shareLink.expiresAt,
        isActive: shareLink.isActive,
        requiresPassword: !!passwordHash,
        customMessage: shareLink.customMessage,
        createdAt: shareLink.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Create share link error:', error)

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

// GET /api/collections/[slug]/share - List all share links for collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`📋 Listing share links for collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all share links for this collection
    const shareLinks = await prisma.enhancedShareLink.findMany({
      where: { collectionId: collection.id },
      orderBy: { createdAt: 'desc' }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    const formattedLinks = shareLinks.map(link => ({
      id: link.id,
      token: link.token,
      shareUrl: `${baseUrl}/gallery/${link.token}`,
      allowDownload: link.allowDownload,
      allowFavorites: link.allowFavorites,
      allowComments: link.allowComments,
      expiresAt: link.expiresAt,
      isActive: link.isActive,
      requiresPassword: !!link.passwordHash,
      customMessage: link.customMessage,
      accessCount: link.accessCount,
      updatedAt: link.updatedAt,
      createdAt: link.createdAt
    }))

    console.log(`✅ Found ${formattedLinks.length} share links`)

    return NextResponse.json({
      shareLinks: formattedLinks
    })

  } catch (error) {
    console.error('❌ List share links error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[slug]/share - Delete/deactivate share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🗑️ Deleting share link for collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { shareLinkId } = body

    if (!shareLinkId) {
      return NextResponse.json({ error: 'Share link ID required' }, { status: 400 })
    }

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Deactivate the share link (soft delete)
    await prisma.enhancedShareLink.update({
      where: { id: shareLinkId },
      data: { isActive: false }
    })

    console.log(`✅ Share link deactivated: ${shareLinkId}`)

    return NextResponse.json({
      success: true,
      message: 'Share link deactivated successfully'
    })

  } catch (error) {
    console.error('❌ Delete share link error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}