// src/lib/download-worker.ts - OPTIMIZADO CON COMPRESIÓN PARALELA
import { Job } from 'bull';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { sendDownloadReadyEmail } from './email/resend';

const execAsync = promisify(exec);

interface DownloadJobData {
  jobId: string;
  collectionId: string;
  collectionTitle: string;
  format: 'original' | 'web';
  notificationEmail?: string;
  photoIds?: string[];
}

interface PhotoFile {
  path: string;
  size: number;
}

// Configuración
const CHUNK_SIZE_BYTES = 7 * 1024 * 1024 * 1024; // 7GB sin comprimir
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/media/storage/rene-rivarola/uploads';
const TEMP_DOWNLOAD_DIR = path.join(UPLOAD_DIR, 'temp-downloads');
const MAX_PARALLEL_ZIPS = 3; // Comprimir hasta 3 ZIPs simultáneamente

export async function processDownloadJob(job: Job<DownloadJobData>) {
  const { jobId, collectionId, collectionTitle, format, notificationEmail, photoIds } = job.data;

  console.log(`[Worker] Processing download job ${jobId} for collection ${collectionId}`);
  if (notificationEmail) {
    console.log(`[Worker] Will notify: ${notificationEmail}`);
  }

  try {
    await prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'processing', progress: 0 }
    });

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        photos: photoIds && photoIds.length > 0
          ? { where: { id: { in: photoIds } } }
          : true,
        owner: {
          select: { email: true }
        }
      }
    });

    if (!collection) {
      throw new Error('Collection not found');
    }

    console.log(`[Worker] Found ${collection.photos.length} photos`);

    // Obtener archivos físicos
    const photoFiles: PhotoFile[] = [];

    for (const photo of collection.photos) {
      const url = format === 'original' ? photo.originalUrl : photo.webUrl;

      if (!url) {
        console.warn(`[Worker] Photo ${photo.id} missing ${format} URL`);
        continue;
      }

      const relativePath = url.replace('/api/uploads/', '');
      const filePath = path.join(UPLOAD_DIR, relativePath);

      try {
        const stats = await fs.stat(filePath);
        photoFiles.push({
          path: filePath,
          size: stats.size
        });
      } catch (error) {
        console.warn(`[Worker] File not found: ${filePath}`);
      }
    }

    if (photoFiles.length === 0) {
      throw new Error('No files found to compress');
    }

    const totalSize = photoFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`[Worker] Total files: ${photoFiles.length}, Total size: ${formatBytes(totalSize)}`);

    // Dividir en chunks
    const chunks = createChunks(photoFiles, CHUNK_SIZE_BYTES);
    console.log(`[Worker] Split into ${chunks.length} parts`);

    await fs.mkdir(TEMP_DOWNLOAD_DIR, { recursive: true });

    const timestamp = Date.now();
    const baseName = `${collection.slug}-${format}-${timestamp}`;

    // COMPRIMIR EN PARALELO (hasta MAX_PARALLEL_ZIPS a la vez)
    const zipUrls: string[] = [];
    const zipPromises: Promise<string>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const partNum = i + 1;
      
      // Agregar promesa al batch
      zipPromises.push(
        createZipPart(chunks[i], baseName, partNum, chunks.length)
      );

      // Si alcanzamos MAX_PARALLEL_ZIPS o es el último chunk, procesar el batch
      if (zipPromises.length >= MAX_PARALLEL_ZIPS || i === chunks.length - 1) {
        console.log(`[Worker] Processing batch of ${zipPromises.length} ZIPs in parallel...`);
        
        const batchResults = await Promise.all(zipPromises);
        zipUrls.push(...batchResults);

        // Actualizar progreso
        const progress = Math.round(((i + 1) / chunks.length) * 100);
        await prisma.downloadJob.update({
          where: { id: jobId },
          data: { progress }
        });
        await job.progress(progress);

        // Limpiar el batch
        zipPromises.length = 0;
      }
    }

    // Marcar como completado
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);
    
    await prisma.downloadJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: 100,
        zipUrl: zipUrls.join(','),
        completedAt: new Date(),
        expiresAt: expiresAt
      }
    });

    console.log(`[Worker] Job ${jobId} completed. Generated ${chunks.length} ZIPs`);

    // Enviar email
    const recipientEmail = notificationEmail || collection.owner?.email;

    if (recipientEmail) {
      console.log(`[Worker] Sending email to ${recipientEmail}${notificationEmail ? ' (custom)' : ' (owner)'}`);

      try {
        const emailResult = await sendDownloadReadyEmail({
          to: recipientEmail,
          collectionTitle: collectionTitle || collection.title,
          totalPhotos: photoFiles.length,
          downloadToken: jobId,
          expiresAt: expiresAt,
          urls: zipUrls
        });

        if (emailResult.success) {
          await prisma.downloadJob.update({
            where: { id: jobId },
            data: { emailSent: true }
          });
          console.log(`[Worker] ✅ Email sent successfully to ${recipientEmail}`);
        } else {
          console.error(`[Worker] ❌ Email failed:`, emailResult.error);
        }
      } catch (emailError) {
        console.error(`[Worker] ❌ Email exception:`, emailError);
      }
    }

    // Programar limpieza
    setTimeout(() => {
      cleanupOldFiles(baseName);
    }, 48 * 60 * 60 * 1000);

    return { success: true, parts: chunks.length };

  } catch (error) {
    console.error(`[Worker] Job ${jobId} failed:`, error);

    await prisma.downloadJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    });

    throw error;
  }
}

// Crear un ZIP (función independiente para paralelización)
async function createZipPart(
  files: PhotoFile[],
  baseName: string,
  partNum: number,
  totalParts: number
): Promise<string> {
  const zipFileName = `${baseName}-part${partNum}.zip`;
  const zipFilePath = path.join(TEMP_DOWNLOAD_DIR, zipFileName);
  const fileListPath = path.join(TEMP_DOWNLOAD_DIR, `${baseName}-part${partNum}.txt`);

  console.log(`[Worker] Creating part ${partNum}/${totalParts}: ${zipFileName}`);

  try {
    // Crear lista de archivos
    const fileList = files.map(f => f.path).join('\n');
    await fs.writeFile(fileListPath, fileList);

    // Comprimir con prioridad normal (nice) para no saturar el CPU
    const zipCommand = `nice -n 10 bash -c 'cat "${fileListPath}" | zip -q -9 -j -@ "${zipFilePath}"'`;

    await execAsync(zipCommand, {
      maxBuffer: 1024 * 1024 * 100,
    });

    // Verificar el archivo
    const zipStats = await fs.stat(zipFilePath);
    console.log(`[Worker] Part ${partNum} created: ${formatBytes(zipStats.size)}`);

    // Limpiar archivo de lista
    await fs.unlink(fileListPath).catch(() => {});

    return `/api/downloads/file/${zipFileName}`;

  } catch (error) {
    console.error(`[Worker] Error creating part ${partNum}:`, error);
    await fs.unlink(fileListPath).catch(() => {});
    await fs.unlink(zipFilePath).catch(() => {});
    throw error;
  }
}

function createChunks(files: PhotoFile[], maxChunkSize: number): PhotoFile[][] {
  const chunks: PhotoFile[][] = [];
  let currentChunk: PhotoFile[] = [];
  let currentSize = 0;

  // Ordenar archivos por tamaño (más grandes primero) para mejor distribución
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);

  for (const file of sortedFiles) {
    if (currentSize + file.size > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(file);
    currentSize += file.size;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function cleanupOldFiles(baseName: string) {
  try {
    const files = await fs.readdir(TEMP_DOWNLOAD_DIR);

    for (const file of files) {
      if (file.startsWith(baseName)) {
        const filePath = path.join(TEMP_DOWNLOAD_DIR, file);
        await fs.unlink(filePath);
        console.log(`[Cleanup] Deleted: ${file}`);
      }
    }
  } catch (error) {
    console.error('[Cleanup] Error:', error);
  }
}

// NUEVA FUNCIÓN: Limpieza inteligente de archivos expirados
export async function cleanupExpiredDownloads() {
  try {
    console.log('[Cleanup] Starting cleanup of expired downloads...');

    // 1. Marcar jobs expirados en DB
    const expiredJobs = await prisma.downloadJob.updateMany({
      where: {
        status: 'completed',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'expired' }
    });

    console.log(`[Cleanup] Marked ${expiredJobs.count} jobs as expired`);

    // 2. Obtener archivos físicos expirados
    const files = await fs.readdir(TEMP_DOWNLOAD_DIR);
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000; // 48 horas
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.zip')) continue;

      const filePath = path.join(TEMP_DOWNLOAD_DIR, file);
      
      try {
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`[Cleanup] Deleted expired file: ${file}`);
        }
      } catch (error) {
        console.warn(`[Cleanup] Error processing ${file}:`, error);
      }
    }

    console.log(`[Cleanup] Deleted ${deletedCount} expired files`);
    return { jobsExpired: expiredJobs.count, filesDeleted: deletedCount };

  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
    return { jobsExpired: 0, filesDeleted: 0 };
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Registrar el procesador del queue con concurrencia
import { downloadQueue } from './download-queue';

// Procesar hasta 2 jobs simultáneamente (cada job puede tener 3 ZIPs en paralelo)
downloadQueue.process(2, async (job) => {
  return await processDownloadJob(job);
});

export function startCleanupWorker() {
  console.log('✅ Cleanup worker initialized');
}

console.log('✅ Download worker registered with parallel compression support');
