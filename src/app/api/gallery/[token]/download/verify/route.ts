import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import crypto from 'crypto'

const VerifyPinSchema = z.object({
  pin: z.string().length(4),
})

// Define the DownloadResolution type to match your Prisma schema
type DownloadResolution = 'web' | 'high_res' | 'original'

interface DownloadPinWithIncludes {
  id: string
  pin: string
  expiresAt: Date
  attempts: number
  maxAttempts: number
  clientEmail: string
  collectionId: string
  usedAt: Date | null
  resolution: string
  collection?: {
    id: string
    title: string
    photos: Array<{
      id: string
      filename: string
      originalFilename: string
      webUrl: string
      highResUrl: string
      originalUrl: string
      fileSize: bigint
      mimeType: string
    }>
  }
  photo?: {
    id: string
    filename: string
    originalFilename: string
    webUrl: string
    highResUrl: string
    originalUrl: string
    fileSize: bigint
    mimeType: string
  }
}

// Helper function to validate and cast resolution
function validateResolution(resolution: string): DownloadResolution {
  if (resolution === 'web' || resolution === 'high_res' || resolution === 'original') {
    return resolution as DownloadResolution
  }
  return 'web' // Default fallback
}

// POST /api/gallery/[token]/download/verify - Verify PIN and provide download
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params
    const { token } = resolvedParams
    
    const body = await request.json()
    const { pin } = VerifyPinSchema.parse(body)

    // Find the PIN record
    const downloadPin = await prisma.downloadPin.findFirst({
      where: {
        pin,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        collection: {
          include: {
            photos: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                filename: true,
                originalFilename: true,
                webUrl: true,
                highResUrl: true,
                originalUrl: true,
                fileSize: true,
                mimeType: true,
              }
            }
          }
        },
        photo: {
          select: {
            id: true,
            filename: true,
            originalFilename: true,
            webUrl: true,
            highResUrl: true,
            originalUrl: true,
            fileSize: true,
            mimeType: true,
          }
        }
      }
    }) as DownloadPinWithIncludes | null

    if (!downloadPin) {
      return NextResponse.json({ error: 'Invalid or expired PIN' }, { status: 403 })
    }

    // Check attempt limit
    if (downloadPin.attempts >= downloadPin.maxAttempts) {
      return NextResponse.json({ error: 'PIN attempt limit exceeded' }, { status: 403 })
    }

    // Verify the gallery access token matches
    const share = await prisma.collectionShare.findUnique({
      where: { accessToken: token },
      select: { collectionId: true }
    })

    if (!share || share.collectionId !== downloadPin.collectionId) {
      // Increment attempts for security
      await prisma.downloadPin.update({
        where: { id: downloadPin.id },
        data: { attempts: downloadPin.attempts + 1 }
      })
      return NextResponse.json({ error: 'Invalid access' }, { status: 403 })
    }

    // Generate signed download URL
    const downloadUrl = generateDownloadUrl(downloadPin)

    // Mark PIN as used and log the download
    await Promise.all([
      prisma.downloadPin.update({
        where: { id: downloadPin.id },
        data: {
          usedAt: new Date(),
          attempts: downloadPin.attempts + 1
        }
      }),
      prisma.downloadActivity.create({
        data: {
          pinId: downloadPin.id,
          clientEmail: downloadPin.clientEmail,
          clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          success: true,
          resolution: validateResolution(downloadPin.resolution), // Fixed: validate and cast the resolution
          fileSize: getFileSize(downloadPin),
          downloadUrl,
        }
      })
    ])

    return NextResponse.json({
      downloadUrl,
      filename: getDownloadFilename(downloadPin),
      fileSize: getFileSize(downloadPin),
      expiresIn: 3600, // URL expires in 1 hour
    })

  } catch (error) {
    console.error('PIN verification error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid PIN format', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateDownloadUrl(downloadPin: DownloadPinWithIncludes): string {
  // Generate a temporary signed URL for secure download
  const timestamp = Date.now()
  const expires = timestamp + (3600 * 1000) // 1 hour

  let filePath = ''

  if (downloadPin.photo) {
    // Single photo download
    switch (downloadPin.resolution) {
      case 'web':
        filePath = downloadPin.photo.webUrl
        break
      case 'high_res':
        filePath = downloadPin.photo.highResUrl || downloadPin.photo.webUrl
        break
      case 'original':
        filePath = downloadPin.photo.originalUrl
        break
      default:
        filePath = downloadPin.photo.webUrl
    }
  } else if (downloadPin.collection) {
    // Collection download - would need to create ZIP
    filePath = `/api/downloads/collection/${downloadPin.collection.id}/${downloadPin.resolution}`
  }

  // Create signed URL with expiration
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'secret')
    .update(`${filePath}:${expires}`)
    .digest('hex')

  return `/api/downloads/secure?path=${encodeURIComponent(filePath)}&expires=${expires}&signature=${signature}`
}

function getDownloadFilename(downloadPin: DownloadPinWithIncludes): string {
  if (downloadPin.photo) {
    return downloadPin.photo.originalFilename
  } else if (downloadPin.collection) {
    return `${downloadPin.collection.title}-${downloadPin.resolution}.zip`
  }
  return 'download.jpg'
}

function getFileSize(downloadPin: DownloadPinWithIncludes): bigint | null {
  if (downloadPin.photo) {
    return downloadPin.photo.fileSize
  }
  // For collections, we'd calculate the total size
  return null
}