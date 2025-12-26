import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Obtener token
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        role: true,
        storageUsedBytes: true,
        maxStorageGB: true,
        collections: {
          select: {
            id: true,
            photos: {
              select: {
                fileSize: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calcular storage real sumando todas las fotos del usuario
    let totalUsedBytes = BigInt(0)
    for (const collection of user.collections) {
      for (const photo of collection.photos) {
        totalUsedBytes += photo.fileSize
      }
    }

    // Actualizar BD si hay diferencia
    if (totalUsedBytes !== user.storageUsedBytes) {
      await prisma.user.update({
        where: { id: user.id },
        data: { storageUsedBytes: totalUsedBytes }
      })
      console.log(`📊 Updated storage for ${user.email}: ${totalUsedBytes} bytes`)
    }

    const maxStorageBytes = BigInt(user.maxStorageGB) * BigInt(1024 * 1024 * 1024)
    const usedGB = Number(totalUsedBytes) / (1024 * 1024 * 1024)
    const maxGB = user.maxStorageGB
    const percentageUsed = (Number(totalUsedBytes) / Number(maxStorageBytes)) * 100

    return NextResponse.json({
      usedBytes: totalUsedBytes.toString(),
      maxBytes: maxStorageBytes.toString(),
      usedGB: parseFloat(usedGB.toFixed(2)),
      maxGB: maxGB,
      percentageUsed: parseFloat(percentageUsed.toFixed(1)),
      available: maxGB - usedGB > 0,
      availableGB: parseFloat((maxGB - usedGB).toFixed(2))
    })
  } catch (error) {
    console.error('❌ Storage calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
