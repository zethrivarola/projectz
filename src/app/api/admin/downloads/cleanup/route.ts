// src/app/api/admin/downloads/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredDownloads } from '@/lib/download-worker';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/media/storage/rene-rivarola/uploads';
const TEMP_DOWNLOAD_DIR = path.join(UPLOAD_DIR, 'temp-downloads');

// POST /api/admin/downloads/cleanup - Limpiar archivos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'expired' } = body;

    console.log(`[Admin] Starting ${type} cleanup...`);

    if (type === 'expired') {
      const result = await cleanupExpiredDownloads();

      return NextResponse.json({
        success: true,
        jobsExpired: result.jobsExpired,
        filesDeleted: result.filesDeleted,
        message: `Limpieza completada: ${result.filesDeleted} archivos y ${result.jobsExpired} jobs expirados`
      });

    } else if (type === 'completed') {
      const completedJobs = await prisma.downloadJob.findMany({
        where: {
          status: 'completed',
          zipUrl: { not: null }
        },
        select: {
          id: true,
          zipUrl: true
        }
      });

      let filesDeleted = 0;

      for (const job of completedJobs) {
        if (!job.zipUrl) continue;

        const zipUrls = job.zipUrl.split(',');
        for (const url of zipUrls) {
          const filename = url.trim().split('/').pop();
          if (!filename) continue;

          const filePath = path.join(TEMP_DOWNLOAD_DIR, filename);

          try {
            await fs.unlink(filePath);
            filesDeleted++;
            console.log(`[Cleanup] Deleted: ${filename}`);
          } catch (error) {
            console.warn(`[Cleanup] Could not delete ${filename}:`, error);
          }
        }
      }

      const jobsMarked = await prisma.downloadJob.updateMany({
        where: {
          status: 'completed'
        },
        data: {
          status: 'expired'
        }
      });

      console.log(`[Admin] Completed cleanup: ${filesDeleted} files deleted, ${jobsMarked.count} jobs marked as expired`);

      return NextResponse.json({
        success: true,
        jobsExpired: jobsMarked.count,
        filesDeleted,
        message: `Limpieza completada: ${filesDeleted} archivos y ${jobsMarked.count} jobs completados limpiados`
      });

    } else if (type === 'all') {
      const allJobs = await prisma.downloadJob.findMany({
        where: {
          OR: [
            { status: 'expired' },
            { status: 'failed' },
            { status: 'completed' }
          ],
          zipUrl: { not: null }
        },
        select: {
          id: true,
          zipUrl: true,
          status: true
        }
      });

      let filesDeleted = 0;

      for (const job of allJobs) {
        if (!job.zipUrl) continue;

        const zipUrls = job.zipUrl.split(',');
        for (const url of zipUrls) {
          const filename = url.trim().split('/').pop();
          if (!filename) continue;

          const filePath = path.join(TEMP_DOWNLOAD_DIR, filename);

          try {
            await fs.unlink(filePath);
            filesDeleted++;
          } catch (error) {
            // Ignorar
          }
        }
      }

      const jobsCleaned = await prisma.downloadJob.updateMany({
        where: {
          OR: [
            { status: 'expired' },
            { status: 'failed' },
            { status: 'completed' }
          ]
        },
        data: {
          status: 'expired',
          zipUrl: null
        }
      });

      return NextResponse.json({
        success: true,
        jobsExpired: jobsCleaned.count,
        filesDeleted,
        message: `Limpieza total: ${filesDeleted} archivos y ${jobsCleaned.count} jobs limpiados`
      });
    }

    return NextResponse.json(
      { error: 'Invalid cleanup type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Admin] Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
