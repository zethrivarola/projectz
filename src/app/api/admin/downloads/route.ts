// src/app/api/admin/downloads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';

// GET /api/admin/downloads - Obtener todos los jobs con stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, processing, completed, failed, expired
// Manejar el caso especial de "active" (pending + processing)
let statusFilter: Prisma.DownloadJobWhereInput = {};
if (status) {
  if (status.includes(',')) {
    // Múltiples status separados por coma
const statuses = status.split(',') as Array<'pending' | 'processing' | 'completed' | 'failed' | 'expired'>;
statusFilter = { status: { in: statuses } };
} else {
  statusFilter = { status: status as 'pending' | 'processing' | 'completed' | 'failed' | 'expired' };
}
}    
const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Filtros
const where: Prisma.DownloadJobWhereInput = {};
if (status) {
  Object.assign(where, statusFilter);
}

    // Obtener jobs
    const jobs = await prisma.downloadJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        status: true,
        progress: true,
        totalPhotos: true,
        totalSize: true,
        format: true,
        notificationEmail: true,
        emailSent: true,
        error: true,
        expiresAt: true,
        createdAt: true,
        completedAt: true,
        collectionId: true,
      }
    });

    // Estadísticas generales
    const stats = await prisma.downloadJob.groupBy({
      by: ['status'],
      _count: true,
    });

    // Total de GB procesados (solo completados)
    const completedJobs = await prisma.downloadJob.aggregate({
      where: { status: 'completed' },
      _sum: { totalSize: true },
      _count: true,
    });

    const totalGBProcessed = completedJobs._sum.totalSize 
      ? Number(completedJobs._sum.totalSize) / (1024 ** 3)
      : 0;

    // Emails enviados
    const emailsSent = await prisma.downloadJob.count({
      where: { emailSent: true }
    });

    // Tiempo promedio de procesamiento
const avgProcessingTime = await prisma.$queryRaw<Array<{ avg_seconds: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
      FROM download_jobs
      WHERE status = 'completed' AND completed_at IS NOT NULL
    `;

    const avgMinutes = avgProcessingTime[0]?.avg_seconds 
      ? Math.round(avgProcessingTime[0].avg_seconds / 60)
      : 0;

return NextResponse.json({
  jobs: jobs.map(job => ({
    ...job,
    totalSize: job.totalSize ? Number(job.totalSize) : null,
  })),
  stats: {
  byStatus: stats.reduce((acc: Record<string, number>, s: { status: string; _count: number }) => {
          acc[s.status] = s._count;
          return acc;
        }, {}),
        totalCompleted: completedJobs._count,
        totalGBProcessed: Math.round(totalGBProcessed * 100) / 100,
        emailsSent,
        avgProcessingMinutes: avgMinutes,
      },
      pagination: {
        limit,
        offset,
        total: await prisma.downloadJob.count({ where }),
      }
    });

  } catch (error) {
    console.error('Error fetching download stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/downloads/[jobId] - Cancelar/eliminar job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Marcar como cancelado
    await prisma.downloadJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: 'Cancelled by admin' }
    });

    return NextResponse.json({ success: true, message: 'Job cancelled' });

  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
