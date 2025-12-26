// src/lib/download-cache.ts
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/media/storage/rene-rivarola/uploads';
const TEMP_DOWNLOAD_DIR = path.join(UPLOAD_DIR, 'temp-downloads');

interface CachedDownload {
  jobId: string;
  zipUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Buscar un download cacheado válido
 * @param collectionId ID de la colección
 * @param format Formato (original o web)
 * @param photoIds IDs específicos de fotos (opcional)
 * @returns Job cacheado o null
 */
export async function findCachedDownload(
  collectionId: string,
  format: 'original' | 'web',
  photoIds?: string[]
): Promise<CachedDownload | null> {
  try {
    // Obtener la colección con fecha de modificación
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        lastModified: true,
        updatedAt: true,
      }
    });

    if (!collection) return null;

    const collectionModified = collection.lastModified || collection.updatedAt;

    // Buscar jobs completados no expirados del mismo formato
    const cachedJobs = await prisma.downloadJob.findMany({
      where: {
        collectionId,
        format,
        status: 'completed',
        expiresAt: { gt: new Date() },
        zipUrl: { not: null },
        // Si se especificaron photoIds, debe ser exactamente el mismo set
        ...(photoIds && photoIds.length > 0 
          ? { photoIds: { equals: photoIds } }
          : { photoIds: { isEmpty: true } }
        )
      },
      orderBy: { completedAt: 'desc' },
      take: 1,
      select: {
        id: true,
        zipUrl: true,
        expiresAt: true,
        createdAt: true,
        completedAt: true,
      }
    });

    if (cachedJobs.length === 0) {
      console.log('[Cache] No cached download found');
      return null;
    }

    const cachedJob = cachedJobs[0];

    // Verificar que el job fue creado DESPUÉS de la última modificación
    const jobCreated = cachedJob.completedAt || cachedJob.createdAt;
    if (jobCreated < collectionModified) {
      console.log('[Cache] Cached download is outdated (collection modified after job)');
      return null;
    }

    // Verificar que los archivos ZIP existen físicamente
    const zipUrls = cachedJob.zipUrl!.split(',');
    const allFilesExist = await verifyZipFiles(zipUrls);

    if (!allFilesExist) {
      console.log('[Cache] Cached ZIP files no longer exist on disk');
      // Marcar como expirado
      await prisma.downloadJob.update({
        where: { id: cachedJob.id },
        data: { status: 'expired' }
      });
      return null;
    }

    console.log(`[Cache] ✅ Found valid cached download: ${cachedJob.id}`);
    console.log(`[Cache] ZIPs: ${zipUrls.length}, Expires: ${cachedJob.expiresAt}`);

    return {
      jobId: cachedJob.id,
      zipUrl: cachedJob.zipUrl!,
      expiresAt: cachedJob.expiresAt!,
      createdAt: cachedJob.createdAt,
    };

  } catch (error) {
    console.error('[Cache] Error finding cached download:', error);
    return null;
  }
}

/**
 * Verificar que todos los archivos ZIP existen en disco
 */
async function verifyZipFiles(zipUrls: string[]): Promise<boolean> {
  try {
    for (const url of zipUrls) {
      const filename = url.trim().split('/').pop();
      if (!filename) continue;

      const filePath = path.join(TEMP_DOWNLOAD_DIR, filename);
      
      try {
        await fs.access(filePath);
      } catch {
        console.log(`[Cache] Missing file: ${filename}`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('[Cache] Error verifying files:', error);
    return false;
  }
}

/**
 * Extender la expiración de un download cacheado
 */
export async function extendCacheExpiration(jobId: string): Promise<void> {
  try {
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 48);

    await prisma.downloadJob.update({
      where: { id: jobId },
      data: { expiresAt: newExpiresAt }
    });

    console.log(`[Cache] Extended expiration for job ${jobId} to ${newExpiresAt}`);
  } catch (error) {
    console.error('[Cache] Error extending expiration:', error);
  }
}
