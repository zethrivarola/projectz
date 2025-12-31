import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/gallery/[token] - Access shared gallery with token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    console.log('🔗 Accessing gallery with token:', token)

    // Find the share link
    const shareLink = await prisma.enhancedShareLink.findUnique({
      where: { token: token },
      include: {
        collection: {
          include: {
            photos: {
where: {
  processingStatus: 'completed',
  isHidden: false  // Siempre ocultar fotos hidden en enlaces compartidos
},
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                filename: true,
                originalFilename: true,
                thumbnailUrl: true,
                webUrl: true,
                highResUrl: true,
                originalUrl: true,
                width: true,
                height: true,
                isRaw: true,
                orderIndex: true,
                isStarred: true,
                isHidden: true,  
              processingStatus: true,
                createdAt: true,
              }
            },
            coverPhoto: {
              select: {
                id: true,
                thumbnailUrl: true,
                webUrl: true
              }
            }
          }
        }
      }
    })

    if (!shareLink) {
      console.log('❌ Share link not found for token:', token)
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    // Check if link is expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      console.log('❌ Share link expired:', token)
      return NextResponse.json({ error: 'Gallery link has expired' }, { status: 410 })
    }

    // Check if link is active
    if (!shareLink.isActive) {
      console.log('❌ Share link is inactive:', token)
      return NextResponse.json({ error: 'Gallery is no longer available' }, { status: 403 })
    }

    // Check password if required
    const { searchParams } = new URL(request.url)
    const providedPassword = searchParams.get('password')

    if (shareLink.passwordHash && !providedPassword) {
      return NextResponse.json({
        error: 'Password required',
        requiresPassword: true
      }, { status: 401 })
    }

    if (shareLink.passwordHash && providedPassword) {
      const bcrypt = await import('bcryptjs')
      const isValid = await bcrypt.default.compare(providedPassword, shareLink.passwordHash)
      
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    }

    // Update access statistics
    await prisma.enhancedShareLink.update({
      where: { id: shareLink.id },
      data: {
        currentViews: { increment: 1 }
      }
    })

    console.log('✅ Gallery accessed:', shareLink.collection.title, '(', shareLink.collection.photos.length, 'photos)')

    // Return gallery data
    return NextResponse.json({
      collection: {
        id: shareLink.collection.id,
        title: shareLink.collection.title,
        description: shareLink.collection.description,
        slug: shareLink.collection.slug,
        coverPhoto: shareLink.collection.coverPhoto,
        tags: shareLink.collection.tags,
        dateTaken: shareLink.collection.dateTaken,
        createdAt: shareLink.collection.createdAt,
design: {
          coverLayout: shareLink.collection.coverLayout || 'center',
          typography: {
            titleFont: shareLink.collection.typographyStyle || 'Inter',
            titleSize: shareLink.collection.titleSize || 48,
            titleColor: shareLink.collection.titleColor || '#ffffff'
          },
          colors: {
            background: shareLink.collection.customBackgroundColor || '#ffffff',
            accent: shareLink.collection.customAccentColor || '#000000'
          },
          grid: {
            columns: shareLink.collection.gridColumns || 4,
            spacing: shareLink.collection.gridSpacing || 8
          },
          coverFocus: shareLink.collection.coverFocalPoint || { x: 50, y: 50 }
        },
      },
      photos: shareLink.collection.photos,
      shareSettings: {
        downloadsEnabled: shareLink.allowDownload,
        favoritesEnabled: shareLink.allowFavorites,
        commentsEnabled: shareLink.allowComments,
        watermarkEnabled: false,
        expiresAt: shareLink.expiresAt,
        accessCount: shareLink.currentViews + 1
      }
    })

  } catch (error) {
    console.error('❌ Gallery access error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/gallery/[token] - Verify password for protected gallery
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { password } = body

    console.log('🔐 Verifying password for token:', token)

    const shareLink = await prisma.enhancedShareLink.findUnique({
      where: { token: token },
      include: {
        collection: {
          include: {
            photos: {
              where: { processingStatus: 'completed' },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                filename: true,
                originalFilename: true,
                thumbnailUrl: true,
                webUrl: true,
                highResUrl: true,
                originalUrl: true,
                width: true,
                height: true,
                isRaw: true,
                orderIndex: true,
                isStarred: true,
                processingStatus: true,
                createdAt: true,
              }
            },
            coverPhoto: {
              select: {
                id: true,
                thumbnailUrl: true,
                webUrl: true
              }
            }
          }
        }
      }
    })

    if (!shareLink) {
      return NextResponse.json({ error: 'Galería no encontrada' }, { status: 404 })
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return NextResponse.json({ error: 'El enlace de la galería ha expirado' }, { status: 410 })
    }

    if (!shareLink.isActive) {
      return NextResponse.json({ error: 'La galería ya no está disponible' }, { status: 403 })
    }

    if (!shareLink.passwordHash) {
      return NextResponse.json({ error: 'La galería no está protegida con contraseña' }, { status: 400 })
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.default.compare(password, shareLink.passwordHash)

    if (!isValid) {
      console.log('❌ Invalid password attempt for token:', token)
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    console.log('✅ Password verified for token:', token)

    // Update access statistics
    await prisma.enhancedShareLink.update({
      where: { id: shareLink.id },
      data: {
        currentViews: { increment: 1 }
      }
    })

    // Return gallery data (same as GET)
    return NextResponse.json({
      collection: {
        id: shareLink.collection.id,
        title: shareLink.collection.title,
        description: shareLink.collection.description,
        slug: shareLink.collection.slug,
        coverPhoto: shareLink.collection.coverPhoto,
        tags: shareLink.collection.tags,
        dateTaken: shareLink.collection.dateTaken,
        createdAt: shareLink.collection.createdAt,
design: {
          coverLayout: shareLink.collection.coverLayout || 'center',
          typography: {
            titleFont: shareLink.collection.typographyStyle || 'Inter',
            titleSize: shareLink.collection.titleSize || 48,
            titleColor: shareLink.collection.titleColor || '#ffffff'
          },
          colors: {
            background: shareLink.collection.customBackgroundColor || '#ffffff',
            accent: shareLink.collection.customAccentColor || '#000000'
          },
          grid: {
            columns: shareLink.collection.gridColumns || 4,
            spacing: shareLink.collection.gridSpacing || 8
          },
          coverFocus: shareLink.collection.coverFocalPoint || { x: 50, y: 50 }
        },
      },
      photos: shareLink.collection.photos,
      shareSettings: {
        downloadsEnabled: shareLink.allowDownload,
        favoritesEnabled: shareLink.allowFavorites,
        commentsEnabled: shareLink.allowComments,
        watermarkEnabled: false,
        expiresAt: shareLink.expiresAt,
        accessCount: shareLink.currentViews + 1
      }
    })
  } catch (error) {
    console.error('❌ Password verification error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
