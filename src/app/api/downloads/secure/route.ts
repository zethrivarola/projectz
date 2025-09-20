import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import mime from 'mime-types'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// GET /api/downloads/secure - Serve files with signature verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    const expires = searchParams.get('expires')
    const signature = searchParams.get('signature')

    if (!filePath || !expires || !signature) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Check if URL has expired
    const expiresTime = parseInt(expires)
    if (Date.now() > expiresTime) {
      return NextResponse.json({ error: 'Download link has expired' }, { status: 403 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'secret')
      .update(`${filePath}:${expires}`)
      .digest('hex')

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Convert relative URL to file system path
    let fullPath: string

    if (filePath.startsWith('/uploads/')) {
      // Direct file path
      fullPath = path.join(process.cwd(), UPLOAD_DIR, filePath.replace('/uploads/', ''))
    } else {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Security check - ensure path is within upload directory
    const normalizedPath = path.normalize(fullPath)
    const uploadDirPath = path.join(process.cwd(), UPLOAD_DIR)

    if (!normalizedPath.startsWith(uploadDirPath)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    try {
      const fileBuffer = await readFile(normalizedPath)
      const mimeType = mime.lookup(normalizedPath) || 'application/octet-stream'
      const filename = path.basename(normalizedPath)

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })

    } catch (fileError) {
      console.error('File not found:', normalizedPath)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Secure download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
