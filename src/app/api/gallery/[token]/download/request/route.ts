import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'

const DownloadRequestSchema = z.object({
  photoId: z.string().optional(),
  collectionId: z.string().optional(),
  clientEmail: z.string().email().optional().nullable(),
  resolution: z.enum(['web', 'high_res', 'original']).default('high_res'),
})

// POST /api/gallery/[token]/download/request - Generate download PIN
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  try {
    const { token } = params
    const body = await request.json()
    const data = DownloadRequestSchema.parse(body)

    // Find the share record to verify access
    const share = await prisma.collectionShare.findUnique({
      where: { accessToken: token },
      include: {
        collection: {
          include: {
            photos: {
              where: data.photoId ? { id: data.photoId } : undefined,
              select: {
                id: true,
                filename: true,
                originalFilename: true,
                webUrl: true,
                highResUrl: true,
                originalUrl: true,
                fileSize: true,
              }
            }
          }
        }
      }
    })

    if (!share) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 404 })
    }

    // Check if link has expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Access link has expired' }, { status: 403 })
    }

    const collection = share.collection

    // Verify download permissions
    if (!collection.downloadsEnabled) {
      return NextResponse.json({ error: 'Downloads are not enabled for this collection' }, { status: 403 })
    }

    // Verify photo exists in collection if photoId provided
    if (data.photoId && collection.photos.length === 0) {
      return NextResponse.json({ error: 'Photo not found in collection' }, { status: 404 })
    }

    // Generate secure 4-digit PIN
    const pin = AuthService.generateDownloadPin()

    // Set expiry time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create download PIN record
    const downloadPin = await prisma.downloadPin.create({
      data: {
        collectionId: data.photoId ? null : collection.id,
        photoId: data.photoId || null,
        pin,
        clientEmail: data.clientEmail,
        resolution: data.resolution,
        expiresAt,
        maxAttempts: 5,
      }
    })

    // TODO: Send email with PIN if clientEmail provided
    if (data.clientEmail) {
      console.log(`Would send PIN ${pin} to ${data.clientEmail}`)
      // await sendPinEmail(data.clientEmail, pin, collection.title)
    }

    // Log download request
    await prisma.viewActivity.create({
      data: {
        collectionId: collection.id,
        photoId: data.photoId || null,
        clientEmail: data.clientEmail,
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      }
    })

    return NextResponse.json({
      pin,
      expiresAt: downloadPin.expiresAt,
      maxAttempts: downloadPin.maxAttempts,
    })

  } catch (error) {
    console.error('Download PIN generation error:', error)

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
