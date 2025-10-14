// src/app/api/collections/public/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/collections/public - Get all public collections (no auth required)
export async function GET(request: NextRequest) {
  try {
    console.log('🌍 Fetching public collections')

    // Get only public collections
    const collections = await prisma.collection.findMany({
      where: {
        visibility: 'public',
        isVisible: true
      },
      include: {
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true
          }
        },
        _count: {
          select: { photos: true }
        }
      },
      orderBy: [
        { isFeatured: 'desc' }, // Featured first
        { createdAt: 'desc' }   // Then newest
      ]
    })

    console.log(`✅ Found ${collections.length} public collections`)

    // Return only safe fields
    const safeCollections = collections.map(col => ({
      id: col.id,
      title: col.title,
      description: col.description,
      slug: col.slug,
      coverPhoto: col.coverPhoto,
      isFeatured: col.isFeatured,
      tags: col.tags,
      dateTaken: col.dateTaken,
      createdAt: col.createdAt,
      _count: col._count,
      // Design fields for preview
      gridStyle: col.gridStyle,
      gridColumns: col.gridColumns,
      typographyStyle: col.typographyStyle,
      colorTheme: col.colorTheme,
      coverFocalPoint: col.coverFocalPoint
    }))

    return NextResponse.json({
      collections: safeCollections,
      total: safeCollections.length
    })

  } catch (error) {
    console.error('❌ Error fetching public collections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}