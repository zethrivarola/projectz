import { NextRequest, NextResponse } from 'next/server'
import { AuthService, canAccessResource } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

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
  coverLayout: z.string().optional(),
  titleSize: z.number().optional(),
  titleColor: z.string().optional(),
  customBackgroundColor: z.string().optional(),
  customAccentColor: z.string().optional()
})

// DRY: Single source of truth for design fields
const DESIGN_FIELDS_SELECT = {
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
  customAccentColor: true,
} as const

// Design fields type (for objects that only have design fields)
type DesignFields = {
  gridStyle: string | null
  gridColumns: number | null
  thumbnailSize: string | null
  gridSpacing: number | null
  navigationStyle: string | null
  typographyStyle: string | null
  colorTheme: string | null
  coverFocalPoint: Prisma.JsonValue | null
  coverLayout: string | null
  titleSize: number | null
  titleColor: string | null
  customBackgroundColor: string | null
  customAccentColor: string | null
}

// Type for collection query with design fields + permissions
type CollectionWithDesignAndOwner = {
  id: string
  ownerId: string | null
  owner: { createdById: string | null } | null
} & DesignFields

// Design settings response type
type DesignSettings = {
  gridStyle: string | null
  gridColumns: number | null
  thumbnailSize: string | null
  gridSpacing: number | null
  navigationStyle: string | null
  typographyStyle: string | null
  colorTheme: string | null
  coverFocalPoint: Prisma.JsonValue | null
  coverLayout: string | null
  titleSize: number | null
  titleColor: string | null
  customBackgroundColor: string | null
  customAccentColor: string | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract design settings from collection or design-only object
 * Ensures we only return design-related fields
 */
function extractDesignSettings(data: DesignFields): DesignSettings {
  return {
    gridStyle: data.gridStyle,
    gridColumns: data.gridColumns,
    thumbnailSize: data.thumbnailSize,
    gridSpacing: data.gridSpacing,
    navigationStyle: data.navigationStyle,
    typographyStyle: data.typographyStyle,
    colorTheme: data.colorTheme,
    coverFocalPoint: data.coverFocalPoint,
    coverLayout: data.coverLayout,
    titleSize: data.titleSize,
    titleColor: data.titleColor,
    customBackgroundColor: data.customBackgroundColor,
    customAccentColor: data.customAccentColor,
  }
}

/**
 * Verify user has access to collection
 * Uses hierarchical permission system
 */
async function verifyCollectionAccess(
  slug: string,
  payload: { userId: string; role: string }
): Promise<CollectionWithDesignAndOwner | null> {
  
  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      owner: {
        select: { createdById: true }
      },
      ...DESIGN_FIELDS_SELECT
    }
  })

  if (!collection) {
    return null
  }

  const hasAccess = canAccessResource({
    userRole: payload.role,
    userId: payload.userId,
    resourceOwnerId: collection.ownerId ?? undefined,
    resourceOwnerCreatedBy: collection.owner?.createdById ?? undefined,
  })

  if (!hasAccess) {
    return null
  }

  return collection
}

/**
 * Parse and validate JWT token from request
 */
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.replace('Bearer ', '')
  const cookieToken = request.cookies.get('auth-token')?.value
  return bearerToken || cookieToken || null
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/collections/[slug]/design
 * Retrieve collection design settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    console.log(`🎨 GET Design settings for collection: ${slug}`)

    // Authenticate
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify access and get collection
    const collection = await verifyCollectionAccess(slug, payload)
    
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      )
    }

    console.log('✅ Design settings retrieved')

    return NextResponse.json({
      design: extractDesignSettings(collection)
    })

  } catch (error) {
    console.error('❌ GET Design settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/collections/[slug]/design
 * Update collection design settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    console.log(`🎨 UPDATE Design settings for collection: ${slug}`)

    // Authenticate
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const data = DesignSchema.parse(body)

    // Verify access (this also checks if collection exists)
    const collection = await verifyCollectionAccess(slug, payload)
    
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      )
    }

    // Update design settings
    const updated = await prisma.collection.update({
      where: { slug },
      data: {
        ...data,
        // Ensure numeric fields are properly typed
        gridColumns: data.gridColumns !== undefined 
          ? parseInt(String(data.gridColumns)) 
          : undefined,
        gridSpacing: data.gridSpacing !== undefined 
          ? parseInt(String(data.gridSpacing)) 
          : undefined,
        titleSize: data.titleSize !== undefined 
          ? parseInt(String(data.titleSize)) 
          : undefined,
        updatedAt: new Date()
      },
      select: DESIGN_FIELDS_SELECT
    })

    console.log('✅ Design settings updated')

    return NextResponse.json({
      success: true,
      message: 'Design settings updated successfully',
      design: extractDesignSettings(updated)
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

/**
 * POST /api/collections/[slug]/design
 * Alias for PUT (for compatibility)
 */
export async function POST(
  request: NextRequest,
  params: { params: Promise<{ slug: string }> }
) {
  return PUT(request, params)
}
