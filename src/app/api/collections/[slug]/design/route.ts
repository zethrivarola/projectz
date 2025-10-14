import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const DesignSchema = z.object({
  gridStyle: z.string().optional(),
  gridColumns: z.number().optional(),
  thumbnailSize: z.string().optional(),
  gridSpacing: z.string().optional(),
  navigationStyle: z.string().optional(),
  typographyStyle: z.string().optional(),
  colorTheme: z.string().optional(),
  coverFocalPoint: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100)
  }).optional(),
  // Nuevos campos
  coverLayout: z.string().optional(),
  titleSize: z.number().optional(),
  titleColor: z.string().optional(),
  customBackgroundColor: z.string().optional(),
  customAccentColor: z.string().optional()
})

// GET /api/collections/[slug]/design - Get collection design settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🎨 GET Design settings for collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get collection design settings
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: {
        id: true,
        ownerId: true,
        gridStyle: true,
        gridColumns: true,
        thumbnailSize: true,
        gridSpacing: true,
        navigationStyle: true,
        typographyStyle: true,
        colorTheme: true,
        coverFocalPoint: true,
        coverLayout: true,
        titleSize: true,
        titleColor: true,
        customBackgroundColor: true,
        customAccentColor: true
      }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('✅ Design settings retrieved')

    return NextResponse.json({
      design: {
        gridStyle: collection.gridStyle,
        gridColumns: collection.gridColumns,
        thumbnailSize: collection.thumbnailSize,
        gridSpacing: collection.gridSpacing,
        navigationStyle: collection.navigationStyle,
        typographyStyle: collection.typographyStyle,
        colorTheme: collection.colorTheme,
        coverFocalPoint: collection.coverFocalPoint,
        coverLayout: collection.coverLayout,
        titleSize: collection.titleSize,
        titleColor: collection.titleColor,
        customBackgroundColor: collection.customBackgroundColor,
        customAccentColor: collection.customAccentColor
      }
    })

  } catch (error) {
    console.error('❌ GET Design settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/collections/[slug]/design - Update collection design settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🎨 UPDATE Design settings for collection: ${slug}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = DesignSchema.parse(body)

    // Get collection to verify ownership
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, ownerId: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.ownerId !== payload.userId && payload.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update design settings
    const updated = await prisma.collection.update({
      where: { slug },
      data: {
        gridStyle: body.gridStyle,
        gridColumns: body.gridColumns ? parseInt(body.gridColumns) : undefined,	
        thumbnailSize: body.thumbnailSize,
        gridSpacing: body.gridSpacing ? parseInt(body.gridSpacing) : undefined,
        navigationStyle: body.navigationStyle,
        typographyStyle: body.typographyStyle,
        colorTheme: body.colorTheme,
        coverFocalPoint: body.coverFocalPoint,
        coverLayout: body.coverLayout,
        titleSize: body.titleSize ? parseInt(body.titleSize) : undefined,
        titleColor: body.titleColor,
        customBackgroundColor: body.customBackgroundColor,
        customAccentColor: body.customAccentColor,
        updatedAt: new Date()
      },
      select: {
        gridStyle: true,
        gridColumns: true,
        thumbnailSize: true,
        gridSpacing: true,
        navigationStyle: true,
        typographyStyle: true,
        colorTheme: true,
        coverFocalPoint: true,
        coverLayout: true,
        titleSize: true,
        titleColor: true,
        customBackgroundColor: true,
        customAccentColor: true
      }
    })

    console.log(`✅ Design settings updated`)

    return NextResponse.json({
      success: true,
      message: 'Design settings updated successfully',
      design: {
        gridStyle: updated.gridStyle,
        gridColumns: updated.gridColumns,
        thumbnailSize: updated.thumbnailSize,
        gridSpacing: updated.gridSpacing,
        navigationStyle: updated.navigationStyle,
        typographyStyle: updated.typographyStyle,
        colorTheme: updated.colorTheme,
        coverFocalPoint: updated.coverFocalPoint,
        coverLayout: updated.coverLayout,
        titleSize: updated.titleSize,
        titleColor: updated.titleColor,
        customBackgroundColor: updated.customBackgroundColor,
        customAccentColor: updated.customAccentColor
      }
    })

  } catch (error) {
    console.error('❌ UPDATE Design settings error:', error)

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

// POST method - alias for PUT
export async function POST(
  request: NextRequest,
  params: { params: Promise<{ slug: string }> }
) {
  return PUT(request, params)
}