import { prisma } from './prisma'

/**
 * Actualiza el storage usado de un usuario sumando todas sus fotos
 */
export async function updateUserStorage(userId: string): Promise<void> {
  try {
    // Calcular total de bytes en todas las colecciones del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        collections: {
          select: {
            photos: {
              select: {
                fileSize: true
              }
            }
          }
        }
      }
    })

    if (!user) return

    let totalBytes = BigInt(0)
    for (const collection of user.collections) {
      for (const photo of collection.photos) {
        totalBytes += photo.fileSize
      }
    }

    // Actualizar en la BD
    await prisma.user.update({
      where: { id: userId },
      data: { storageUsedBytes: totalBytes }
    })

    console.log(`✅ Updated storage for user ${userId}: ${totalBytes} bytes`)
  } catch (error) {
    console.error('❌ Error updating user storage:', error)
  }
}

/**
 * Verifica si un usuario tiene espacio disponible
 */
export async function checkStorageAvailable(
  userId: string,
  additionalBytes: bigint
): Promise<{ available: boolean; message?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageUsedBytes: true,
        maxStorageGB: true
      }
    })

    if (!user) {
      return { available: false, message: 'User not found' }
    }

    const maxBytes = BigInt(user.maxStorageGB) * BigInt(1024 * 1024 * 1024)
    const afterUpload = user.storageUsedBytes + additionalBytes

    if (afterUpload > maxBytes) {
      const availableGB = Number(maxBytes - user.storageUsedBytes) / (1024 * 1024 * 1024)
      return {
        available: false,
        message: `Not enough storage. Available: ${availableGB.toFixed(2)} GB`
      }
    }

    return { available: true }
  } catch (error) {
    console.error('❌ Error checking storage:', error)
    return { available: false, message: 'Error checking storage' }
  }
}
