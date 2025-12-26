import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const token = params.token;

    // Buscar el job por ID (el token es el jobId)
    const job = await prisma.downloadJob.findFirst({
      where: { 
        id: token,
        status: 'completed'
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Download not found' },
        { status: 404 }
      );
    }

    // Verificar expiración
    if (job.expiresAt && new Date() > job.expiresAt) {
      return NextResponse.json(
        { error: 'Download link expired' },
        { status: 410 }
      );
    }

    // Obtener información de la colección
    const collection = await prisma.collection.findUnique({
      where: { id: job.collectionId },
      select: {
        title: true,
        slug: true
      }
    });

    // Devolver URLs de descarga
    const urls = job.zipUrl?.split(',').map(url => url.trim()) || [];

    return NextResponse.json({
      collectionTitle: collection?.title || 'Collection',
      totalPhotos: job.totalPhotos,
      format: job.format,
      urls: urls,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt
    });

  } catch (error) {
    console.error('Download token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
