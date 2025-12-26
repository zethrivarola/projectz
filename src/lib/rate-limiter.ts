// src/lib/rate-limiter.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

interface RateLimitConfig {
  maxRequests: number;  // Máximo de requests
  windowMs: number;     // Ventana de tiempo en milisegundos
  message?: string;     // Mensaje personalizado
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  total: number;
}

// Configuraciones predefinidas
export const RATE_LIMITS = {
  DOWNLOAD: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: 'Has alcanzado el límite de descargas por hora. Intenta nuevamente más tarde.'
  },
  DOWNLOAD_LARGE: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    message: 'Has alcanzado el límite de descargas grandes por hora. Intenta nuevamente más tarde.'
  },
  API_GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
    message: 'Demasiadas solicitudes. Por favor, espera un momento.'
  }
};

/**
 * Verificar rate limit para una IP
 * @param ip Dirección IP del cliente
 * @param key Identificador único del límite (ej: 'download', 'api')
 * @param config Configuración del rate limit
 * @returns Resultado con allowed, remaining, resetTime
 */
export async function checkRateLimit(
  ip: string,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const redisKey = `ratelimit:${key}:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Usar Redis sorted set para rastrear requests
    const multi = redis.multi();

    // Eliminar requests antiguos fuera de la ventana
    multi.zremrangebyscore(redisKey, '-inf', windowStart);

    // Contar requests actuales en la ventana
    multi.zcard(redisKey);

    // Agregar el request actual
    multi.zadd(redisKey, now, `${now}-${Math.random()}`);

    // Setear expiración de la key
    multi.expire(redisKey, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis multi exec failed');
    }

    // El segundo comando (zcard) nos da el count antes de agregar el actual
    const currentCount = (results[1][1] as number) || 0;
    const total = currentCount + 1; // +1 porque ya agregamos el actual

    const allowed = total <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - total);
    const resetTime = new Date(now + config.windowMs);

    if (!allowed) {
      console.log(`[RateLimit] ❌ IP ${ip} exceeded limit for ${key}: ${total}/${config.maxRequests}`);
    } else {
      console.log(`[RateLimit] ✅ IP ${ip} allowed for ${key}: ${total}/${config.maxRequests}`);
    }

    return {
      allowed,
      remaining,
      resetTime,
      total
    };

  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // En caso de error, permitir la request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
      total: 0
    };
  }
}

/**
 * Obtener la IP del cliente desde headers
 */
export function getClientIP(request: Request): string {
  const headers = new Headers(request.headers);
  
  // Intentar varios headers en orden de prioridad
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Puede ser una lista separada por comas, tomar la primera
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback (no debería llegar aquí en producción con proxy)
  return 'unknown';
}

/**
 * Resetear rate limit para una IP (útil para testing o admin)
 */
export async function resetRateLimit(ip: string, key: string): Promise<void> {
  try {
    const redisKey = `ratelimit:${key}:${ip}`;
    await redis.del(redisKey);
    console.log(`[RateLimit] Reset limit for IP ${ip} key ${key}`);
  } catch (error) {
    console.error('[RateLimit] Error resetting rate limit:', error);
  }
}

/**
 * Obtener información de rate limit sin consumir una request
 */
export async function getRateLimitInfo(
  ip: string,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const redisKey = `ratelimit:${key}:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Eliminar antiguos y contar
    await redis.zremrangebyscore(redisKey, '-inf', windowStart);
    const currentCount = await redis.zcard(redisKey);

    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetTime = new Date(now + config.windowMs);

    return {
      allowed: currentCount < config.maxRequests,
      remaining,
      resetTime,
      total: currentCount
    };

  } catch (error) {
    console.error('[RateLimit] Error getting rate limit info:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: new Date(Date.now() + config.windowMs),
      total: 0
    };
  }
}

console.log('✅ Rate limiter initialized');
