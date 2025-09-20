import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { RawProcessor } from '@/lib/raw-processor'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100') * 1024 * 1024 // Configurable MB

// Supported file types
const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  // RAW formats
  'image/x-canon-cr2',
  'image/x-canon-crw',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-adobe-dng',
  'image/x-panasonic-raw'
]

interface ProcessedImage {
  thumbnailUrl: string
  webUrl: string
  highResUrl?: string
  originalUrl: string
  width: number
  height: number
}

import { storage } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({
        error: 'Unauthorized - Please login to upload photos',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      }, { status: 401 })
    }

    console.log(`📤 Processing file upload for user: ${payload.email}`)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const collectionId = formData.get('collectionId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!collectionId) {
      return NextResponse.json({ error: 'Collection ID required' }, { status: 400 })
    }

    console.log(`📁 Uploading file: ${file.name} (${file.size} bytes) to collection: ${collectionId}`)

    // Verify collection ownership (using persistent storage)
    const collectionsMap = await storage.getCollections()
    const collection = collectionsMap.get(collectionId)
    if (!collection) {
      return NextResponse.json({
        error: 'Collection not found',
        code: 'COLLECTION_NOT_FOUND'
      }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({
        error: 'Access denied - You do not own this collection',
        code: 'ACCESS_DENIED'
      }, { status: 403 })
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        code: 'FILE_TOO_LARGE'
      }, { status: 400 })
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type. Supported formats: JPEG, PNG, TIFF, WebP, and RAW files',
        code: 'UNSUPPORTED_TYPE'
      }, { status: 400 })
    }

    // Generate unique filename
    const fileId = uuidv4()
    const fileExtension = path.extname(file.name)
    const baseFilename = `${fileId}${fileExtension}`

    // Create upload directories
    const collectionDir = path.join(UPLOAD_DIR, collectionId)
    const originalDir = path.join(collectionDir, 'original')
    const thumbnailDir = path.join(collectionDir, 'thumbnails')
    const webDir = path.join(collectionDir, 'web')
    const highResDir = path.join(collectionDir, 'high-res')

    await Promise.all([
      fs.mkdir(originalDir, { recursive: true }),
      fs.mkdir(thumbnailDir, { recursive: true }),
      fs.mkdir(webDir, { recursive: true }),
      fs.mkdir(highResDir, { recursive: true })
    ])

    // Save original file
    const originalPath = path.join(originalDir, baseFilename)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(originalPath, buffer)

    console.log(`💾 Saved original file to: ${originalPath}`)

    // Process image
    let processedImage: ProcessedImage
    let exifData = null
    let width = 0
    let height = 0

    const isRawFile = await RawProcessor.isRawFile(file.name)

    if (isRawFile) {
      console.log('📸 Processing RAW file...')
      // Process RAW file with enhanced metadata extraction and preview generation
      try {
        // Extract comprehensive RAW metadata
        const rawMetadata = await RawProcessor.extractRawMetadata(originalPath)

        width = rawMetadata.width || 0
        height = rawMetadata.height || 0
        exifData = {
          ...rawMetadata,
          isRaw: true,
          rawFormat: path.extname(file.name).toLowerCase(),
          processingStatus: 'pending'
        }

        // Generate RAW previews
        const thumbnailFilename = `thumb_${baseFilename.replace(fileExtension, '.jpg')}`
        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)
        await RawProcessor.generateRawPreview(originalPath, thumbnailPath, 'thumbnail')

        const webFilename = `web_${baseFilename.replace(fileExtension, '.jpg')}`
        const webPath = path.join(webDir, webFilename)
        await RawProcessor.generateRawPreview(originalPath, webPath, 'web')

        // Generate high-res preview
        const highResFilename = `highres_${baseFilename.replace(fileExtension, '.jpg')}`
        const highResPath = path.join(highResDir, highResFilename)
        await RawProcessor.generateRawPreview(originalPath, highResPath, 'preview')

        processedImage = {
          originalUrl: `/uploads/${collectionId}/original/${baseFilename}`,
          thumbnailUrl: `/uploads/${collectionId}/thumbnails/${thumbnailFilename}`,
          webUrl: `/uploads/${collectionId}/web/${webFilename}`,
          highResUrl: `/uploads/${collectionId}/high-res/${highResFilename}`,
          width,
          height
        }

        console.log('✅ RAW file processed successfully')

      } catch (rawError) {
        console.error('❌ RAW processing error:', rawError)
        // Fallback to placeholder if RAW processing fails
        processedImage = {
          originalUrl: `/uploads/${collectionId}/original/${baseFilename}`,
          thumbnailUrl: `/api/placeholder?width=300&height=400&text=RAW+Error`,
          webUrl: `/api/placeholder?width=800&height=1200&text=RAW+Processing+Failed`,
          width: 0,
          height: 0
        }
        exifData = {
          isRaw: true,
          rawFormat: path.extname(file.name).toLowerCase(),
          processingStatus: 'failed',
          error: rawError instanceof Error ? rawError.message : 'Unknown error'
        }
      }
    } else {
      console.log('🖼️ Processing standard image file...')
      // Process regular image files
      try {
        const image = sharp(buffer)
        const metadata = await image.metadata()

        width = metadata.width || 0
        height = metadata.height || 0
        exifData = metadata.exif ? {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha
        } : null

        // Generate thumbnail (400px max dimension)
        const thumbnailFilename = `thumb_${baseFilename.replace(fileExtension, '.jpg')}`
        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)
        await image
          .resize(400, 400, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath)

        // Generate web size (1200px max dimension)
        const webFilename = `web_${baseFilename.replace(fileExtension, '.jpg')}`
        const webPath = path.join(webDir, webFilename)
        await image
          .resize(1200, 1200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toFile(webPath)

        // Generate high-res (2400px max dimension)
        const highResFilename = `highres_${baseFilename.replace(fileExtension, '.jpg')}`
        const highResPath = path.join(highResDir, highResFilename)
        await image
          .resize(2400, 2400, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 90 })
          .toFile(highResPath)

        processedImage = {
          originalUrl: `/uploads/${collectionId}/original/${baseFilename}`,
          thumbnailUrl: `/uploads/${collectionId}/thumbnails/${thumbnailFilename}`,
          webUrl: `/uploads/${collectionId}/web/${webFilename}`,
          highResUrl: `/uploads/${collectionId}/high-res/${highResFilename}`,
          width,
          height
        }

        console.log('✅ Standard image processed successfully')

      } catch (error) {
        console.error('❌ Image processing error:', error)
        // If processing fails, still save the original
        processedImage = {
          originalUrl: `/uploads/${collectionId}/original/${baseFilename}`,
          thumbnailUrl: `/api/placeholder?width=300&height=400&text=Error`,
          webUrl: `/api/placeholder?width=800&height=1200&text=Error`,
          width: 0,
          height: 0
        }
      }
    }

    // Get next order index
    const photosMap = await storage.getPhotos()
    const existingPhotos = Array.from(photosMap.values()).filter(p => p.collectionId === collectionId)
    const orderIndex = existingPhotos.length + 1

    // Create the photo record
    const photoRecord = {
      id: fileId,
      filename: baseFilename,
      originalFilename: file.name,
      collectionId: collectionId,
      orderIndex: orderIndex,
      thumbnailUrl: processedImage.thumbnailUrl,
      webUrl: processedImage.webUrl,
      highResUrl: processedImage.highResUrl,
      originalUrl: processedImage.originalUrl,
      width: processedImage.width,
      height: processedImage.height,
      isRaw: isRawFile,
      processingStatus: isRawFile ? 'completed' : 'completed',
      uploadedAt: new Date(),
      createdAt: new Date(),
      metadata: exifData
    }

    // Save to persistent storage and update collection
    await storage.setPhoto(fileId, photoRecord)

    // Update collection photo count and set cover photo
    const updatedCollection = collectionsMap.get(collectionId)
    if (updatedCollection) {
      updatedCollection.photoCount = (updatedCollection.photoCount || 0) + 1
      updatedCollection.updatedAt = new Date()

      // If this is the first photo in the collection, set it as cover photo
      if (updatedCollection.photoCount === 1 && !updatedCollection.coverPhoto) {
        updatedCollection.coverPhoto = {
          id: photoRecord.id,
          thumbnailUrl: photoRecord.thumbnailUrl,
          webUrl: photoRecord.webUrl
        }
        console.log(`🖼️ Set first uploaded photo as cover for collection ${collectionId}`)
      }

      // Save updated collection
      await storage.setCollection(collectionId, updatedCollection)
      console.log(`📊 Updated collection ${collectionId} photo count to: ${updatedCollection.photoCount}`)
    }

    console.log(`🎉 Upload completed successfully: ${photoRecord.originalFilename}`)

    return NextResponse.json({
      id: photoRecord.id,
      filename: photoRecord.filename,
      originalFilename: photoRecord.originalFilename,
      thumbnailUrl: photoRecord.thumbnailUrl,
      webUrl: photoRecord.webUrl,
      highResUrl: photoRecord.highResUrl,
      originalUrl: photoRecord.originalUrl,
      width: photoRecord.width,
      height: photoRecord.height,
      isRaw: photoRecord.isRaw,
      processingStatus: photoRecord.processingStatus,
      uploadedAt: photoRecord.uploadedAt
    })

  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'UPLOAD_FAILED'
      },
      { status: 500 }
    )
  }
}

// Configure to handle large file uploads
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '100mb', // Ajusta según tu necesidad
  },
}
