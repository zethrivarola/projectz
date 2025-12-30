import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    
    if (!payload || payload.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Obtener collections del cliente (SIN filtrar fotos ocultas - el cliente las ocultó)
    const collections = await prisma.collection.findMany({
      where: {
        ownerId: payload.userId,
        isVisible: true
      },
      include: {
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true,
            isHidden: true  // Incluir flag para mostrar badge si está oculta
          }
        },
        _count: {
          select: { 
            photos: true  // Contar TODAS las fotos (incluidas ocultas)
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Found ${collections.length} collections for client ${payload.email}`)

    return NextResponse.json({
      success: true,
      collections
    })
  } catch (error) {
    console.error('❌ Error fetching client collections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}
