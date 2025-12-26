import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/collections/[slug]/share/[linkId] - Delete share link permanently
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; linkId: string }> }
) {
  try {
    const { slug, linkId } = await params

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🗑️ Permanently deleting share link: ${linkId}`)

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

    // Get share link to verify it belongs to this collection
    const shareLink = await prisma.enhancedShareLink.findUnique({
      where: { id: linkId }
    })

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    if (shareLink.collectionId !== collection.id) {
      return NextResponse.json({ error: 'Share link does not belong to this collection' }, { status: 403 })
    }

    // Only allow permanent deletion if link is already deactivated
    if (shareLink.isActive) {
      return NextResponse.json(
        { error: 'Link must be deactivated before permanent deletion' },
        { status: 400 }
      )
    }

    // Delete permanently
    await prisma.enhancedShareLink.delete({
      where: { id: linkId }
    })

    console.log(`✅ Share link permanently deleted: ${linkId}`)

    return NextResponse.json({
      success: true,
      message: 'Share link permanently deleted'
    })

  } catch (error) {
    console.error('❌ Permanent delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
