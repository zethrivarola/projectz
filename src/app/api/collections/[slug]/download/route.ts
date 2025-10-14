import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'
import { Readable } from 'stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for large collections

// POST /api/collections/[slug]/download - Generate ZIP for bulk download
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { format = 'original', photoIds } = body // format: 'web' | 'original'

    console.log(`📦 Generating ZIP for collection: ${slug}`)
    console.log(`   Format: ${format}`)
    console.log(`   Photos: ${photoIds ? photoIds.length : 'all'}`)

    // Get collection
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        photos: {
          where: photoIds ? { id: { in: photoIds } } : { processingStatus: 'completed' },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            originalFilename: true,
            webUrl: true,
            originalUrl: true,
          }
        }
      }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check if collection is public
    if (collection.visibility !== 'public') {
      // For private collections, would need auth check here
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (collection.photos.length === 0) {
      return NextResponse.json({ error: 'No photos to download' }, { status: 400 })
    }

    console.log(`✅ Found ${collection.photos.length} photos to zip`)

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Set response headers for ZIP download
    const zipFilename = `${collection.slug}-${format}.zip`
    const headers = new Headers()
    headers.set('Content-Type', 'application/zip')
    headers.set('Content-Disposition', `attachment; filename="${zipFilename}"`)

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('❌ Archive error:', err)
      throw err
    })

    // Add photos to archive
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    let addedCount = 0

    for (const photo of collection.photos) {
      try {
        // Determine which file to use based on format
const url = format === 'original' ? photo.originalUrl : photo.webUrl

if (!url) {
  console.warn(`  ⚠️ No URL for photo ${photo.id}`)
  continue
}

// Extract the file path from URL (remove /api/uploads/ prefix)
const filePath = url.replace('/api/uploads/', '')
        const fullPath = path.join(uploadDir, filePath)

        // Check if file exists
        if (fs.existsSync(fullPath)) {
          // Add file to archive with original filename
          const filename = photo.originalFilename
          archive.file(fullPath, { name: filename })
          addedCount++
          console.log(`  ✓ Added: ${filename}`)
        } else {
          console.warn(`  ⚠️ File not found: ${fullPath}`)
        }
      } catch (error) {
        console.error(`  ❌ Error adding photo ${photo.id}:`, error)
      }
    }

    if (addedCount === 0) {
      return NextResponse.json({ error: 'No valid photos found to zip' }, { status: 500 })
    }

    // Add a README file with collection info
    const readmeContent = `${collection.title}
${'='.repeat(collection.title.length)}

${collection.description || 'Photo collection by René Rivarola Photography'}

Total Photos: ${addedCount}
Format: ${format === 'original' ? 'Original Quality' : 'Web Quality (1080p)'}
Downloaded: ${new Date().toLocaleString()}

---
© ${new Date().getFullYear()} René Rivarola Photography
All rights reserved.
`
    archive.append(readmeContent, { name: 'README.txt' })

// Finalize the archive and collect data
const chunks: Buffer[] = []

await new Promise<void>((resolve, reject) => {
  archive.on('data', (chunk: Buffer) => {
    chunks.push(chunk)
  })
  
  archive.on('end', () => {
    resolve()
  })
  
  archive.on('error', (err) => {
    reject(err)
  })
  
  archive.finalize()
})

const buffer = Buffer.concat(chunks)

console.log(`✅ ZIP created with ${addedCount} photos (${buffer.length} bytes)`)

return new NextResponse(buffer, {
  headers,
  status: 200
})

  } catch (error) {
    console.error('❌ Bulk download error:', error)
    return NextResponse.json(
      { error: 'Failed to create download', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}