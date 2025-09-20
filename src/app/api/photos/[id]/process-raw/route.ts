import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'
import { RawProcessor, RawProcessingSettings } from '@/lib/raw-processor'
import { z } from 'zod'
import path from 'path'
import fs from 'fs/promises'

const ProcessRawSchema = z.object({
  settings: z.object({
    exposure: z.number().min(-2).max(2).default(0),
    shadows: z.number().min(0).max(100).default(0),
    highlights: z.number().min(0).max(100).default(0),
    contrast: z.number().min(-100).max(100).default(0),
    vibrance: z.number().min(-100).max(100).default(0),
    saturation: z.number().min(-100).max(100).default(0),
    temperature: z.number().min(2000).max(10000).default(5500),
    tint: z.number().min(-100).max(100).default(0),
    clarity: z.number().min(-100).max(100).default(0),
    sharpening: z.number().min(0).max(100).default(25),
    noiseReduction: z.number().min(0).max(100).default(25),
  }),
  preset: z.string().optional(),
  saveAsNew: z.boolean().default(false),
})

interface PhotoWithCollection {
  id: string
  filename: string
  originalFilename: string
  isRaw: boolean
  originalUrl?: string
  width?: number
  height?: number
  collectionId: string
  orderIndex: number
  processingStatus: string
  exifData?: Record<string, unknown>
  collection: {
    id: string
    title: string
    ownerId: string
  }
}

interface ExifData {
  processedSettings?: Record<string, unknown>
  processedAt?: string
  isProcessed?: boolean
  processingError?: string
  lastProcessingAttempt?: string
  parentPhotoId?: string
  isProcessedVersion?: boolean
  [key: string]: unknown
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// POST /api/photos/[id]/process-raw - Process RAW photo with settings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Fixed: changed from 'slug' to 'id'
) {
  try {
    // Fixed: await params and destructure id correctly
    const resolvedParams = await params
    const { id } = resolvedParams  // Fixed: changed from 'slug' to 'id'
    
    // Check authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { settings, preset, saveAsNew } = ProcessRawSchema.parse(body)

    // Verify photo ownership and RAW status
    const photo = await prisma.photo.findFirst({
      where: {
        id: id,  // Fixed: use destructured 'id' instead of 'params.id'
        collection: {
          ownerId: payload.userId
        }
      },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          }
        }
      }
    }) as PhotoWithCollection | null

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (!photo.isRaw) {
      return NextResponse.json({ error: 'Photo is not a RAW file' }, { status: 400 })
    }

    // Validate processing settings
    if (!RawProcessor.validateProcessingSettings(settings)) {
      return NextResponse.json({ error: 'Invalid processing settings' }, { status: 400 })
    }

    // Get original file path
    const originalPath = path.join(process.cwd(), UPLOAD_DIR, photo.originalUrl?.replace('/uploads/', '') || '')

    // Check if original file exists
    try {
      await fs.access(originalPath)
    } catch {
      return NextResponse.json({ error: 'Original RAW file not found' }, { status: 404 })
    }

    // Create processed version directory
    const collectionId = photo.collection.id
    const processedDir = path.join(UPLOAD_DIR, collectionId, 'processed')
    await fs.mkdir(processedDir, { recursive: true })

    // Generate processed filename
    const timestamp = Date.now()
    const processedFilename = `processed_${photo.filename.replace(/\.[^/.]+$/, '')}_${timestamp}.jpg`
    const processedPath = path.join(processedDir, processedFilename)
    const processedUrl = `/uploads/${collectionId}/processed/${processedFilename}`

    try {
      // Process the RAW file with settings
      await RawProcessor.processRawWithSettings(originalPath, processedPath, settings)

      // Update photo record with processed version info
      const updateData: Record<string, unknown> = {
        processingStatus: 'completed',
        exifData: {
          ...(photo.exifData as ExifData || {}),
          processedSettings: settings,
          processedAt: new Date().toISOString(),
          isProcessed: true,
        }
      }

      if (saveAsNew) {
        // Create a new photo record for the processed version
        const processedPhoto = await prisma.photo.create({
          data: {
            collectionId: photo.collectionId,
            filename: processedFilename,
            originalFilename: `${photo.originalFilename.replace(/\.[^/.]+$/, '')}_processed.jpg`,
            fileSize: BigInt(0), // Will be updated after file processing
            mimeType: 'image/jpeg',
            width: photo.width,
            height: photo.height,
            isRaw: false,
            orderIndex: photo.orderIndex + 0.1,
            processingStatus: 'completed',
            thumbnailUrl: processedUrl, // Use processed as thumbnail
            webUrl: processedUrl,
            highResUrl: processedUrl,
            originalUrl: processedUrl,
            exifData: {
              ...(updateData.exifData as ExifData),
              parentPhotoId: photo.id,
              isProcessedVersion: true,
            }
          }
        })

        return NextResponse.json({
          processedUrl,
          newPhotoId: processedPhoto.id,
          settings,
          message: 'RAW photo processed and saved as new photo'
        })
      } else {
        // Update existing photo with processed version
        updateData.webUrl = processedUrl
        updateData.highResUrl = processedUrl

        await prisma.photo.update({
          where: { id: id },  // Fixed: use destructured 'id' instead of 'params.id'
          data: updateData
        })

        return NextResponse.json({
          processedUrl,
          settings,
          message: 'RAW photo processed successfully'
        })
      }

    } catch (processingError) {
      console.error('RAW processing error:', processingError)

      // Update photo status to failed
      await prisma.photo.update({
        where: { id: id },  // Fixed: use destructured 'id' instead of 'params.id'
        data: {
          processingStatus: 'failed',
          exifData: {
            ...(photo.exifData as ExifData || {}),
            processingError: processingError instanceof Error ? processingError.message : 'Unknown error',
            lastProcessingAttempt: new Date().toISOString(),
          }
        }
      })

      return NextResponse.json(
        { error: 'RAW processing failed', details: processingError instanceof Error ? processingError.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('RAW processing API error:', error)

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

// GET /api/photos/[id]/process-raw - Get RAW processing info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Fixed: changed from 'slug' to 'id'
) {
  try {
    // Fixed: await params and destructure id correctly
    const resolvedParams = await params
    const { id } = resolvedParams  // Fixed: changed from 'slug' to 'id'
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get photo with processing info
    const photo = await prisma.photo.findFirst({
      where: {
        id: id,  // Fixed: use destructured 'id' instead of 'params.id'
        collection: {
          ownerId: payload.userId
        }
      },
      select: {
        id: true,
        filename: true,
        originalFilename: true,
        isRaw: true,
        processingStatus: true,
        exifData: true,
        thumbnailUrl: true,
        webUrl: true,
        originalUrl: true,
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    if (!photo.isRaw) {
      return NextResponse.json({ error: 'Photo is not a RAW file' }, { status: 400 })
    }

    // Extract processing info from exifData
    const exifData = photo.exifData as ExifData || {}
    const processingInfo = {
      isProcessed: exifData.isProcessed || false,
      processedAt: exifData.processedAt,
      processedSettings: exifData.processedSettings || RawProcessor.getDefaultProcessingSettings(),
      processingStatus: photo.processingStatus,
      processingError: exifData.processingError,
      lastProcessingAttempt: exifData.lastProcessingAttempt,
    }

    return NextResponse.json({
      photo: {
        id: photo.id,
        filename: photo.filename,
        originalFilename: photo.originalFilename,
        isRaw: photo.isRaw,
        thumbnailUrl: photo.thumbnailUrl,
        webUrl: photo.webUrl,
        originalUrl: photo.originalUrl,
      },
      processing: processingInfo,
      defaultSettings: RawProcessor.getDefaultProcessingSettings(),
    })

  } catch (error) {
    console.error('RAW processing info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}