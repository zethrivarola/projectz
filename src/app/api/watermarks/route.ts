import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const WATERMARK_DIR = path.join(UPLOAD_DIR, 'watermarks')

// GET /api/watermarks - List user's watermarks
export async function GET(request: NextRequest) {
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

    const watermarks = await prisma.watermark.findMany({
      where: { ownerId: payload.userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ watermarks })

  } catch (error) {
    console.error('Watermarks GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/watermarks - Upload new watermark
export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('watermark') as File
    const name = formData.get('name') as string || 'Watermark'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.includes('png')) {
      return NextResponse.json({
        error: 'Only PNG files with transparency are supported'
      }, { status: 400 })
    }

    // Generate unique filename
    const fileId = uuidv4()
    const filename = `${fileId}.png`

    // Create watermark directory
    await fs.mkdir(WATERMARK_DIR, { recursive: true })

    // Save original file
    const watermarkPath = path.join(WATERMARK_DIR, filename)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process and optimize watermark
    try {
      const processedBuffer = await sharp(buffer)
        .png({
          quality: 90,
          compressionLevel: 6,
          palette: true // Optimize for smaller file size while preserving transparency
        })
        .toBuffer()

      await fs.writeFile(watermarkPath, processedBuffer)

      // Get image metadata
      const metadata = await sharp(processedBuffer).metadata()

    } catch (imageError) {
      console.error('Image processing error:', imageError)
      // Fall back to saving original file
      await fs.writeFile(watermarkPath, buffer)
    }

    // Save to database
    const watermark = await prisma.watermark.create({
      data: {
        ownerId: payload.userId,
        name,
        fileUrl: `/uploads/watermarks/${filename}`,
        position: 'bottom_right',
        scale: 0.15,
        opacity: 0.8,
      }
    })

    return NextResponse.json(watermark, { status: 201 })

  } catch (error) {
    console.error('Watermark upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
