import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'
import { canAccessResource } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Obtener la foto con su colección
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        collection: {
          include: {
            owner: {
              select: {
                id: true,
                createdById: true
              }
            }
          }
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Verificar permisos: owner de la colección o admin
    const hasAccess = canAccessResource({
      userRole: payload.role,
      userId: payload.userId,
      resourceOwnerId: photo.collection.ownerId,
      resourceOwnerCreatedBy: photo.collection.owner?.createdById
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ocultar la foto
    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenBy: payload.userId,
        hiddenAt: new Date()
      }
    })

    console.log(`✅ Photo ${id} hidden by ${payload.email}`)

    return NextResponse.json({
      success: true,
      photo: {
        id: updatedPhoto.id,
        isHidden: updatedPhoto.isHidden
      }
    })
  } catch (error) {
    console.error('❌ Error hiding photo:', error)
    return NextResponse.json(
      { error: 'Failed to hide photo' },
      { status: 500 }
    )
  }
}
