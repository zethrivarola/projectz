// Reemplazar: /src/app/api/collections/[slug]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { downloadQueue } from '@/lib/download-queue'
import { findCachedDownload, extendCacheExpiration } from '@/lib/download-cache';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limiter';

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/collections/[slug]/download - Crear job de descarga
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { format = 'original', photoIds, notificationEmail } = body

    console.log(`📦 Creating download job for collection: ${slug}`)
    
    // Validar email si fue proporcionado
    if (notificationEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(notificationEmail)) {
        return NextResponse.json(
          { error: 'Email inválido' },
          { status: 400 }
        )
      }
      console.log(`📧 Email de notificación: ${notificationEmail}`)
    }

// RATE LIMITING - Verificar límite por IP
const clientIP = getClientIP(request);
console.log(`🌐 Download request from IP: ${clientIP}`);

// Usar límite más estricto para colecciones grandes (>200 fotos o >10GB)
const isLargeDownload = photoIds ? photoIds.length > 200 : false;
const rateLimitConfig = isLargeDownload ? RATE_LIMITS.DOWNLOAD_LARGE : RATE_LIMITS.DOWNLOAD;

const rateLimit = await checkRateLimit(clientIP, 'download', rateLimitConfig);

if (!rateLimit.allowed) {
  console.log(`🚫 Rate limit exceeded for IP ${clientIP}`);
  return NextResponse.json(
    {
      error: rateLimitConfig.message,
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime,
      retryAfter: Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000)
    },
    { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
        'Retry-After': Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000).toString()
      }
    }
  );
}

console.log(`✅ Rate limit OK for IP ${clientIP}: ${rateLimit.remaining} remaining`);

    // Obtener colección
const collection = await prisma.collection.findUnique({
  where: { slug },
  include: {
    photos: photoIds && photoIds.length > 0
      ? { 
          where: { id: { in: photoIds } },
          select: { id: true, fileSize: true }
        }
      : { select: { id: true, fileSize: true } }
  }
})

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Verificar si es pública (agregar auth check si es necesario)
    if (collection.visibility !== 'public') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

// BUSCAR CACHÉ PRIMERO
console.log('🔍 Checking cache for existing download...');
const cachedDownload = await findCachedDownload(
  collection.id,
  format as 'original' | 'web',
  photoIds
);

if (cachedDownload) {
  console.log('✅ Cache hit! Returning existing download');
  
  // Extender expiración (opcional, para mantener activo)
  await extendCacheExpiration(cachedDownload.jobId);
  
  // Si hay email, enviar notificación inmediata
  if (notificationEmail) {
    const { sendDownloadReadyEmail } = await import('@/lib/email/resend');
    const totalPhotos = photoIds?.length || collection.photos.length;
    const zipUrls = cachedDownload.zipUrl.split(',');
    
    await sendDownloadReadyEmail({
      to: notificationEmail,
      collectionTitle: collection.title,
      totalPhotos,
      downloadToken: cachedDownload.jobId,
      expiresAt: cachedDownload.expiresAt,
      urls: zipUrls
    });
    
    console.log(`📧 Sent cached download email to ${notificationEmail}`);
  }
  
  return NextResponse.json({
    success: true,
    jobId: cachedDownload.jobId,
    status: 'completed',
    cached: true,
    message: notificationEmail 
      ? 'Descarga lista (caché). Email enviado.'
      : 'Descarga lista desde caché',
    zipUrl: cachedDownload.zipUrl,
    expiresAt: cachedDownload.expiresAt,
  });
}

console.log('❌ No cache found. Creating new download job...');


// Calcular tamaño total
const totalSize = collection.photos.reduce(
  (sum, photo) => sum + BigInt(photo.fileSize || 0),
  BigInt(0)
);

    // Crear job en DB
    const job = await prisma.downloadJob.create({
data: {
  collectionId: collection.id,
  format,
  photoIds: photoIds || [],
  status: 'pending',
  progress: 0,
  totalPhotos: collection.photos.length,  // <-- AGREGAR ESTO
  totalSize,  // <-- AGREGAR ESTO
  notificationEmail: notificationEmail || null,
  emailSent: false,
  }
  });

console.log(`✅ Created download job: ${job.id}${notificationEmail ? ` with email: ${notificationEmail}` : ''}`);

    // Agregar a la cola de Bull
    await downloadQueue.add({
      jobId: job.id,
      collectionId: collection.id,
      collectionSlug: collection.slug,
      collectionTitle: collection.title,
      format,
      photoIds: photoIds || undefined,
      notificationEmail: notificationEmail || undefined,
    }, {
      jobId: job.id, // Usar mismo ID para tracking
      timeout: 300000, // 5 minutos timeout
    })

    console.log(`✅ Job added to queue: ${job.id}`)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: notificationEmail 
        ? 'Tu descarga se está preparando. Recibirás un email cuando esté lista.'
        : 'Download job created. Processing will start shortly.',
    })
  } catch (error) {
    console.error('❌ Create download job error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create download job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
