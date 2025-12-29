// src/app/api/photos/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { RawProcessor } from '@/lib/raw-processor'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma' // <-- tu instancia Prisma

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100') * 1024 * 1024 // MB -> bytes

const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'image/x-canon-cr2',
  'image/x-canon-crw',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-adobe-dng',
  'image/x-panasonic-raw'
]

export async function POST(request: NextRequest) {
  try {
    // === Autenticación ===
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized - login required' }, { status: 401 })

    const payload = AuthService.verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // === FormData ===
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const collectionId = formData.get('collectionId') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!collectionId) return NextResponse.json({ error: 'collectionId is required' }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Max ${MAX_FILE_SIZE / (1024 * 1024)} MB` }, { status: 400 })
    }
   // Verificar tipo por extensión para archivos RAW
const fileExtension = path.extname(file.name).toLowerCase()
const rawExtensions = ['.cr2', '.crw', '.nef', '.arw', '.dng', '.raw', '.rw2', '.orf', '.raf']
const isRawByExtension = rawExtensions.includes(fileExtension)

const commonImageTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp']
const isCommonImage = commonImageTypes.includes(file.type)

if (!isCommonImage && !isRawByExtension) {
  return NextResponse.json({ 
    error: `Unsupported file type: ${file.type}. Extension: ${fileExtension}` 
  }, { status: 400 })
}

    // === Verificar colección existe y permisos ===
    const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
    if (!collection) return NextResponse.json({ error: 'Collection not found' }, { status: 404 })

    // payload.userId debe existir en tu token
    if (collection.ownerId !== payload.userId && payload.role !== 'SUPER_ADMIN') {
      // si tienes roles distintos adapta esta validación
      return NextResponse.json({ error: 'Access denied - not owner' }, { status: 403 })
    }

    // === Preparar nombres y carpetas ===
    const fileId = uuidv4()
    
    const baseFilename = `${fileId}${fileExtension}`

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

    // === Guardar original ===
    const originalPath = path.join(originalDir, baseFilename)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(originalPath, buffer)

    // === Procesamiento (RAW / normal) ===
    let thumbnailUrl = ''
    let webUrl = ''
    let highResUrl: string | null = null
    let width = 0
    let height = 0
    
    const originalUrl = `/api/uploads/${collectionId}/original/${baseFilename}`

    const isRaw = isRawByExtension || await RawProcessor.isRawFile((file as File).name)
    if (isRaw) {
      // RAW: intenta generar previews desde RawProcessor (puede lanzar)
      try {
        const rawMeta = await RawProcessor.extractRawMetadata(originalPath)
width = rawMeta.width || 0
height = rawMeta.height || 0

        const thumbnailFilename = `thumb_${baseFilename.replace(fileExtension, '.jpg')}`
        const webFilename = `web_${baseFilename.replace(fileExtension, '.jpg')}`
        const highResFilename = `highres_${baseFilename.replace(fileExtension, '.jpg')}`

        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)
        const webPath = path.join(webDir, webFilename)
        const highResPath = path.join(highResDir, highResFilename)

        await RawProcessor.generateRawPreview(originalPath, thumbnailPath, 'thumbnail')
        await RawProcessor.generateRawPreview(originalPath, webPath, 'web')
        await RawProcessor.generateRawPreview(originalPath, highResPath, 'preview')

        thumbnailUrl = `/api/uploads/${collectionId}/thumbnails/${thumbnailFilename}`
        webUrl = `/api/uploads/${collectionId}/web/${webFilename}`
        highResUrl = `/api/uploads/${collectionId}/high-res/${highResFilename}`
      } catch (err) {
        console.error('RAW processing failed:', err)
        // fallback placeholder urls (no interrumpimos)
        thumbnailUrl = `/api/placeholder?width=300&height=200&text=RAW+Error`
        webUrl = `/api/placeholder?width=1200&height=800&text=RAW+Error`
      }
    } else {
      // Imagen normal: usar sharp
      try {
        const image = sharp(buffer)
        const meta = await image.metadata()
width = meta.width ?? 0
height = meta.height ?? 0

        const thumbnailFilename = `thumb_${baseFilename.replace(fileExtension, '.jpg')}`
        const webFilename = `web_${baseFilename.replace(fileExtension, '.jpg')}`
        const highResFilename = `highres_${baseFilename.replace(fileExtension, '.jpg')}`

        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)
        const webPath = path.join(webDir, webFilename)
        const highResPath = path.join(highResDir, highResFilename)

        await image.resize(400, 400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbnailPath)
        await image.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(webPath)
        await image.resize(2400, 2400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(highResPath)

        thumbnailUrl = `/api/uploads/${collectionId}/thumbnails/${thumbnailFilename}`
        webUrl = `/api/uploads/${collectionId}/web/${webFilename}`
        highResUrl = `/api/uploads/${collectionId}/high-res/${highResFilename}`
      } catch (err) {
        console.error('Image processing error:', err)
        thumbnailUrl = `/api/placeholder?width=300&height=200&text=Error`
        webUrl = `/api/placeholder?width=1200&height=800&text=Error`
      }
    }

    // === Obtener orderIndex (conteo actual) ===
    const count = await prisma.photo.count({ where: { collectionId } })
    const orderIndex = count + 1

    // === Guardar en DB con transacción ===
    const created = await prisma.$transaction(async (tx) => {
      const photo = await tx.photo.create({
        data: {
          id: fileId,
          collectionId,
          filename: baseFilename,
          originalFilename: (file as File).name,
          fileSize: BigInt(file.size),
          mimeType: file.type || null,
          width: width || null,
          height: height || null,
          isRaw,
          orderIndex,
          processingStatus: 'completed',
          thumbnailUrl,
          webUrl,
          highResUrl: highResUrl ?? null,
          originalUrl,
        }
      })

      // Si la colección no tiene coverPhotoId, ponemos esta foto como cover
      const updates: {
  updatedAt: Date
  coverPhotoId?: string
} = { updatedAt: new Date() }
      if (!collection.coverPhotoId) updates.coverPhotoId = photo.id

      await tx.collection.update({
        where: { id: collectionId },
        data: updates
      })

      return photo
    })

    // === Respuesta ===
    return NextResponse.json({
      id: created.id,
      filename: created.filename,
      originalFilename: created.originalFilename,
      thumbnailUrl: created.thumbnailUrl,
      webUrl: created.webUrl,
      highResUrl: created.highResUrl,
      originalUrl: created.originalUrl,
      width: created.width,
      height: created.height,
      isRaw: created.isRaw,
      processingStatus: created.processingStatus,
      uploadedAt: created.createdAt
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}


