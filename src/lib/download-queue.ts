// src/lib/download-queue.ts - OPTIMIZADO
import Bull from 'bull'
import Redis from 'ioredis'

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}

// Crear cliente Redis para Bull
const client = new Redis(redisConfig)
const subscriber = new Redis(redisConfig)

// Configuración optimizada para comprimir múltiples ZIPs en paralelo
export const downloadQueue = new Bull('downloads', {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return client
      case 'subscriber':
        return subscriber
      default:
        return new Redis(redisConfig)
    }
  },
  defaultJobOptions: {
    attempts: 1, // Reintentar 3 veces si falla
    backoff: {
      type: 'exponential',
      delay: 5000, // Esperar 5s, luego 10s, luego 20s
    },
    removeOnComplete: 100, // Mantener últimos 100 completados
    removeOnFail: 50, // Mantener últimos 50 fallidos
timeout: 7200000, // Timeout de 2 horas (para colecciones muy grandes)
  },
  limiter: {
    max: 5, // Máximo 5 jobs simultáneos
    duration: 1000, // Por segundo
  },
  settings: {
    lockDuration: 3600000, // Lock de 1 hora para jobs largos
    stalledInterval: 300000, // Revisar jobs "stalled" cada 5 minutos
    maxStalledCount: 1, // Si un job se queda "stalled" más de 1 vez, marcarlo como fallido
  }
})

export interface DownloadJobData {
  jobId: string // ID del DownloadJob en DB
  collectionId: string
  collectionSlug: string
  collectionTitle: string
  format: 'web' | 'original'
  photoIds?: string[] // null = todas
  notificationEmail?: string
}

// Cleanup automático de ZIPs viejos cada hora
export async function setupCleanupCron() {
  const cleanupQueue = new Bull('cleanup', {
    createClient: () => new Redis(redisConfig),
  })

  // Cada hora a las :00
  await cleanupQueue.add(
    'cleanup-old-zips',
    {},
    {
      repeat: { cron: '0 * * * *' }, // Every hour
      removeOnComplete: true,
    }
  )

  // Procesar cleanup
  cleanupQueue.process(async () => {
    const { cleanupExpiredDownloads } = await import('./download-worker');
    await cleanupExpiredDownloads();
    return { success: true };
  });

  return cleanupQueue
}

// Eventos del queue para monitoring
downloadQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

downloadQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

downloadQueue.on('stalled', (job) => {
  console.warn(`⚠️ Job ${job.id} stalled`);
});

downloadQueue.on('progress', (job, progress) => {
  console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

console.log('✅ Download queue initialized with concurrency support')
