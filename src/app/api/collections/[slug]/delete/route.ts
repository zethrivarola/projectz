import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'
import { demoCollections, demoPhotos } from './globals' // Importamos variables globales

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const resolvedParams = await params
    const { slug } = resolvedParams

    const collection = await prisma.collection.findFirst({
      where: {
        slug,
        ownerId: payload.userId,
      },
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Eliminar fotos
    await prisma.photo.deleteMany({
      where: { collectionId: collection.id },
    })

    // Eliminar shares
    await prisma.collectionShare.deleteMany({
      where: { collectionId: collection.id },
    })

    // Eliminar la colección
    await prisma.collection.delete({
      where: { id: collection.id },
    })

    // Opcional: eliminar de las variables globales si se usa para demo
    demoCollections.delete(slug)
    demoPhotos.forEach((photo, key) => {
      if (photo.collectionId === collection.id) demoPhotos.delete(key)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Collection DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
