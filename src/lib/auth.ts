import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { User } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-for-testing-only-very-long-and-secure'
const JWT_EXPIRES_IN = '7d' // Extended to 7 days for demo stability
const REFRESH_TOKEN_EXPIRES_IN = '30d'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword)
  }

  static async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateTokens(user: Pick<User, 'id' | 'email' | 'role'>): AuthTokens {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
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

    return {
      accessToken,
      refreshToken,
      expiresAt
    }
  }

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

  static generateAccessToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  static generateDownloadPin(): string {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}
