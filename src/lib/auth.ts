import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'zAf7itnxlnjXTp+wzAjWL/zoBBN+B+WzDLluB2yMeeE='

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in your environment variables.')
}

const JWT_EXPIRES_IN = '7d'
const REFRESH_TOKEN_EXPIRES_IN = '30d'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  firstName?: string | null
  lastName?: string | null
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

// ====== FUNCIONES STANDALONE PARA COMPATIBILIDAD ======

/**
 * Verifica un token JWT y retorna el payload si es válido
 * @param token - Token JWT a verificar
 * @returns Payload del token o null si es inválido
 */
export async function verifyAuth(token: string): Promise<JWTPayload | null> {
  return AuthService.verifyToken(token)
}

/**
 * Genera un token JWT para un usuario
 * @param payload - Datos del usuario
 * @returns Token JWT firmado
 */
export function generateToken(payload: { userId: string; email: string }): string {
  const fullPayload: JWTPayload = {
    userId: payload.userId,
    email: payload.email,
    role: 'USER'
  }
  
  return jwt.sign(fullPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'personal-photography-portfolio'
  })
}

/**
 * Extrae el token del header de autorización
 * @param authHeader - Header de autorización (ej: "Bearer token")
 * @returns Token extraído o null
 */
export function getTokenFromHeaders(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  // Soportar ambos formatos: "Bearer token" y "token"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  return authHeader
}

// ====== CLASE PRINCIPAL AuthService ======

export class AuthService {
  /**
   * Hashea una contraseña usando bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  /**
   * Verifica una contraseña contra su hash
   */
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  /**
   * Alias de verifyPassword para compatibilidad
   */
  static async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  /**
   * Genera tokens de acceso y refresh para un usuario
   */
  static generateTokens(user: Pick<User, 'id' | 'email' | 'role' | 'firstName' | 'lastName'>): AuthTokens {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null
    }

    console.log('🔑 Generating tokens for user:', user.email)

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'personal-photography-portfolio'
    })

    const refreshToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'personal-photography-portfolio'
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    console.log('✅ Tokens generated successfully')
    console.log('📅 Access token expires:', expiresAt.toISOString())

    return {
      accessToken,
      refreshToken,
      expiresAt
    }
  }

  /**
   * Verifica un token JWT
   */
  static verifyToken(token: string): JWTPayload | null {
    try {
      console.log('🔍 Verifying token...')
      
      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: 'personal-photography-portfolio'
      }) as JWTPayload

      console.log('✅ Token verified successfully for user:', payload.email)
      console.log('🕐 Token expires at:', new Date((payload.exp || 0) * 1000).toISOString())

      return payload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('❌ Token expired at:', error.expiredAt)
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('❌ Token malformed:', error.message)
      } else {
        console.log('❌ Token verification failed:', error instanceof Error ? error.message : 'Unknown error')
      }
      return null
    }
  }

  /**
   * Genera un token de acceso aleatorio (para compartir galerías)
   */
  static generateAccessToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Genera un PIN de 4 dígitos para descargas
   */
  static generateDownloadPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  /**
   * Convierte un título en un slug URL-friendly
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  /**
   * Genera un token de verificación para email
   */
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Refresca un token expirado usando el refresh token
   */
  static refreshAccessToken(refreshToken: string): string | null {
    try {
      const payload = jwt.verify(refreshToken, JWT_SECRET, {
        issuer: 'personal-photography-portfolio'
      }) as JWTPayload

      // Generar nuevo access token
      const newPayload: JWTPayload = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName
      }

      return jwt.sign(newPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'personal-photography-portfolio'
      })
    } catch (error) {
      console.error('Failed to refresh token:', error)
      return null
    }
  }
}

// Exportar funciones adicionales para uso directo
export const hashPassword = AuthService.hashPassword
export const verifyPassword = AuthService.verifyPassword
export const comparePasswords = AuthService.comparePasswords
export const generateTokens = AuthService.generateTokens
export const verifyToken = AuthService.verifyToken
export const generateAccessToken = AuthService.generateAccessToken
export const generateDownloadPin = AuthService.generateDownloadPin
export const generateSlug = AuthService.generateSlug
export const generateVerificationToken = AuthService.generateVerificationToken
export const refreshAccessToken = AuthService.refreshAccessToken
// ====== FUNCIONES DE PERMISOS Y AUTORIZACIÓN ======

/**
 * Verifica si un rol es Super Admin
 */
export function isSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN'
}

/**
 * Verifica si un rol es Admin (Super Admin o Photographer)
 * NOTA: Photographer solo tiene acceso a SUS clientes
 */
export function isAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'PHOTOGRAPHER'
}

export interface PermissionCheckParams {
  userRole: string
  userId: string
  resourceOwnerId?: string | null // El owner de la collection/resource
  resourceOwnerCreatedBy?: string | null // Quién creó al owner (para validar photographer)
}

/**
 * Verifica si un usuario puede acceder a un recurso (collection, photo, etc)
 * 
 * Reglas de acceso:
 * - SUPER_ADMIN: Acceso absoluto a TODO
 * - PHOTOGRAPHER: Solo a SUS recursos y recursos de SUS clientes
 * - CLIENT: Solo a SUS propios recursos
 * 
 * @param params - Parámetros de verificación
 * @returns true si tiene acceso, false si no
 */
export function canAccessResource(params: PermissionCheckParams): boolean {
  const { userRole, userId, resourceOwnerId, resourceOwnerCreatedBy } = params

  // SUPER_ADMIN tiene acceso absoluto
  if (userRole === 'SUPER_ADMIN') {
    return true
  }

  // PHOTOGRAPHER solo puede acceder si:
  // 1. Es el owner del recurso, O
  // 2. El owner es un cliente que ÉL creó
  if (userRole === 'PHOTOGRAPHER') {
    // Es su propio recurso
    if (resourceOwnerId === userId) {
      return true
    }
    // Es un recurso de un cliente suyo
    if (resourceOwnerCreatedBy === userId) {
      return true
    }
    return false
  }

  // CLIENT solo puede acceder si es el owner
  if (userRole === 'CLIENT') {
    return resourceOwnerId === userId
  }

  return false
}

/**
 * Verifica si un usuario puede modificar un recurso
 * (Mismas reglas que canAccessResource pero más estricto)
 */
export function canModifyResource(params: PermissionCheckParams): boolean {
  return canAccessResource(params)
}

/**
 * Verifica si un usuario puede eliminar un recurso
 * (Mismas reglas que canAccessResource)
 */
export function canDeleteResource(params: PermissionCheckParams): boolean {
  return canAccessResource(params)
}
