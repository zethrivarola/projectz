import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { stat } from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await the params Promise
    const resolvedParams = await params
    const filePath = path.join(UPLOAD_DIR, ...resolvedParams.path)

    // Security check: ensure the path is within uploads directory
    const resolvedPath = path.resolve(filePath)
    const uploadsPath = path.resolve(UPLOAD_DIR)

    if (!resolvedPath.startsWith(uploadsPath)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if file exists
    try {
      const stats = await stat(resolvedPath)
      if (!stats.isFile()) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Read file
    const fileBuffer = await fs.readFile(resolvedPath)

    // Determine content type based on file extension
    const ext = path.extname(resolvedPath).toLowerCase()
    let contentType = 'application/octet-stream'

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
      case '.tiff':
      case '.tif':
        contentType = 'image/tiff'
        break
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })

  } catch (error) {
    console.error('File server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}