import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function isAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN'
}

const UpdateClientSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

// GET /api/clients/[id] - Ver cliente con sus collections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 GET Client: ${id}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const client = await prisma.user.findUnique({
      where: { id, role: 'CLIENT' },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        storageUsedBytes: true,
        maxStorageGB: true,
        collections: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            visibility: true,
            isFeatured: true,
            isStarred: true,
            dateTaken: true,
            createdAt: true,
            coverPhoto: {
              select: {
                id: true,
                thumbnailUrl: true,
                webUrl: true,
              }
            },
            _count: {
              select: { photos: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { collections: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    console.log(`✅ Client found: ${client.email} with ${client.collections.length} collections`)

    return NextResponse.json({ client })

  } catch (error) {
    console.error('❌ GET Client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id] - Actualizar cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 PATCH Client: ${id}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const data = UpdateClientSchema.parse(body)

    // Verificar que el cliente existe
    const existingClient = await prisma.user.findUnique({
      where: { id, role: 'CLIENT' }
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Hash password si se proporciona
    let passwordHash = existingClient.passwordHash
    if (data.password) {
      passwordHash = await AuthService.hashPassword(data.password)
    }

    // Actualizar cliente
    const updatedClient = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    console.log(`✅ Client updated: ${updatedClient.email}`)

    return NextResponse.json({ client: updatedClient })

  } catch (error) {
    console.error('❌ PATCH Client error:', error)

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

// DELETE /api/clients/[id] - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    console.log(`🔍 DELETE Client: ${id}`)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload || !isAdmin(payload.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verificar que el cliente existe
    const client = await prisma.user.findUnique({
      where: { id, role: 'CLIENT' },
      include: {
        _count: {
          select: { collections: true }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Eliminar cliente (cascade eliminará sus collections)
    await prisma.user.delete({
      where: { id }
    })

    console.log(`✅ Client deleted: ${client.email} (${client._count.collections} collections removed)`)

    return NextResponse.json({
      message: 'Client deleted successfully',
      deletedCollections: client._count.collections
    })

  } catch (error) {
    console.error('❌ DELETE Client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
