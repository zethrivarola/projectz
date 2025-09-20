import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const ReorderSchema = z.object({
  photoOrders: z.array(z.object({
    id: z.string(),
    orderIndex: z.number()
  }))
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    // Check authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { photoOrders } = ReorderSchema.parse(body)

    console.log(`Reordering photos for collection ${slug}:`, photoOrders.length, 'photos')

    // Find the collection by slug using Prisma
    const collection = await prisma.collection.findFirst({
      where: {
        slug: slug,
        ownerId: payload.userId
      }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Check ownership (already filtered in the query above)
    console.log(`Found collection: ${collection.title} (${collection.id})`)

    // Update the orderIndex for each photo using Prisma transaction
    let updatedCount = 0
    
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const photoOrder of photoOrders) {
        const result = await tx.photo.updateMany({
          where: {
            id: photoOrder.id,
            collectionId: collection.id
          },
          data: {
            orderIndex: photoOrder.orderIndex
          }
        })
        updatedCount += result.count
      }

      // Update collection timestamp
      await tx.collection.update({
        where: { id: collection.id },
        data: { updatedAt: new Date() }
      })
    })

    console.log(`Photos reordered successfully for collection: ${slug}`)

    return NextResponse.json({
      success: true,
      message: 'Photos reordered successfully',
      collectionId: collection.id,
      updatedPhotos: updatedCount
    })

  } catch (error) {
    console.error('Reorder photos error:', error)

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