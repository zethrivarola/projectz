import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'

// POST /api/collections/[slug]/[id]/share/email - Send share email
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
    
    // Await params and destructure
    const resolvedParams = await params
    const { id, slug } = resolvedParams
    
    const body = await request.json()
    const { recipientEmail, message, shareUrl } = body

    // Verify collection ownership
    const collection = await prisma.collection.findFirst({
      where: {
        id: id,  // Fixed: use destructured 'id' instead of 'params.id'
        ownerId: payload.userId
      }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Log email activity
    await prisma.emailActivity.create({
      data: {
        collectionId: id,  // Fixed: use destructured 'id' instead of 'params.id'
        templateName: 'collection_sharing',
        recipientEmail,
        subject: `Photos shared: ${collection.title}`,
      }
    })

    // TODO: Integrate with actual email service
    console.log('Email would be sent to:', recipientEmail)
    console.log('Share URL:', shareUrl)
    console.log('Message:', message)

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}