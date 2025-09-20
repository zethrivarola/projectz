interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  ownerId: string
  visibility: string
  isStarred: boolean
  isFeatured: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  coverPhoto?: Record<string, unknown>
  design?: Record<string, unknown>
}

interface Photo {
  id: string
  filename: string
  originalFilename: string
  collectionId: string
  createdAt: Date
}

interface ShareRecord {
  shareToken: string
  collectionId: string
  visibility: string
  password?: string
  accessCount: number
}

import { PrismaClient } from '@prisma/client'

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database service layer
export class DatabaseService {
  // Collections
  static async getCollections(userId: string, role: string) {
    const where = role === 'admin' ? {} : { ownerId: userId }

    return await prisma.collection.findMany({
      where,
      include: {
        _count: {
          select: { photos: true }
        },
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  static async getCollectionBySlug(slug: string, userId: string, role: string) {
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        photos: {
          orderBy: { orderIndex: 'asc' }
        },
        _count: {
          select: { photos: true }
        },
        coverPhoto: {
          select: {
            id: true,
            thumbnailUrl: true,
            webUrl: true
          }
        }
      }
    })

    if (!collection) return null

    // Check access permissions
    if (role !== 'admin' && collection.ownerId !== userId) {
      // Check if user has access through shares
      const hasAccess = await prisma.collectionShare.findFirst({
        where: {
          collectionId: collection.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      })

      if (!hasAccess) return null
    }

    return collection
  }

  static async createCollection(data: {
    title: string
    description?: string
    ownerId: string
    visibility: 'public' | 'private' | 'password_protected'
    tags: string[]
  }) {
    const slug = data.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    return await prisma.collection.create({
      data: {
        ...data,
        slug: `${slug}-${Date.now()}`, // Ensure uniqueness
      }
    })
  }

  static async updateCollection(id: string, data: Collection) {
    return await prisma.collection.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  static async deleteCollection(id: string) {
    // Delete associated photos first
    await prisma.photo.deleteMany({
      where: { collectionId: id }
    })

    // Delete share links
    await prisma.collectionShare.deleteMany({
      where: { collectionId: id }
    })

    // Delete the collection
    return await prisma.collection.delete({
      where: { id }
    })
  }

  // Photos
  static async getPhotos(collectionId: string) {
    return await prisma.photo.findMany({
      where: { collectionId },
      orderBy: { orderIndex: 'asc' }
    })
  }

  static async createPhoto(data: {
    filename: string
    originalFilename: string
    thumbnailUrl: string
    webUrl: string
    originalUrl: string
    aspectRatio: string
    isRaw: boolean
    rawFormat?: string
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
    collectionId: string
    orderIndex: number
    metadata?: Record<string, unknown>
    fileSize: number
    mimeType: string
    uploaderId: string
  }) {
    return await prisma.photo.create({
      data: {
        ...data,
        fileSize: BigInt(data.fileSize)
      }
    })
  }

  static async updatePhoto(id: string, data: Photo | null) {
    return await prisma.photo.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  static async deletePhoto(id: string) {
    return await prisma.photo.delete({
      where: { id }
    })
  }

  // Batch processing
  static async createBatchJob(data: {
    photos: string[]
    settings: Collection[]
    status: string
    userId: string
  }) {
    // Note: Batch jobs would be handled with the existing schema
    // For now, return a mock response
    return { id: 'batch-' + Date.now(), ...data }
  }

  static async updateBatchJob(id: string, data: ShareRecord | null) {
    // Note: Update would be handled with existing schema
    return { id, ...data, updatedAt: new Date() }
  }

  static async getBatchJobs(userId: string) {
    // Note: Would query existing batch processing records
    return []
  }

  // Share Links - Using existing CollectionShare model
  static async createShareLink(data: {
    token: string
    collectionId: string
    title: string
    description?: string
    isPasswordProtected: boolean
    password?: string
    allowDownload: boolean
    allowComments: boolean
    allowFavorites: boolean
    expiresAt?: Date
    maxViews?: number
    createdBy: string
    recipientEmails: string[]
    customMessage?: string
    trackingEnabled: boolean
    requirePin: boolean
    downloadPin?: string
  }) {
    return await prisma.collectionShare.create({
      data: {
        collectionId: data.collectionId,
        sharedBy: data.createdBy,
        accessToken: data.token,
        expiresAt: data.expiresAt,
        recipientEmail: data.recipientEmails[0] // Use first email for now
      }
    })
  }

  static async getShareLinks(collectionId: string) {
    return await prisma.collectionShare.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async getShareLinkByToken(token: string) {
    return await prisma.collectionShare.findUnique({
      where: { accessToken: token },
      include: {
        collection: {
          include: {
            photos: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      }
    })
  }

  static async updateShareLink(id: string, data: Record<string, unknown>) {
    return await prisma.collectionShare.update({
      where: { id },
      data: {
        ...data
      }
    })
  }

  static async recordShareActivity(data: {
    shareId: string
    action: string
    userAgent: string
    ipAddress: string
    details?: Record<string, unknown>
  }) {
    // Note: Would use ViewActivity model for now
    return { id: 'activity-' + Date.now(), ...data }
  }

  // Photo Selections (Client Favorites) - Using existing PhotoFavorite model
  static async createSelectionSession(data: {
    collectionId: string
    clientId: string
    clientName: string
    clientEmail: string
    deadline?: Date
    instructions?: string
    allowDownload: boolean
    maxSelections?: number
  }) {
    // Note: Would create a session record - for now return mock
    return { id: 'session-' + Date.now(), ...data }
  }

  static async getSelectionSessions(collectionId: string) {
    // Note: Would query session records
    return []
  }

  static async createPhotoSelection(data: {
    sessionId: string
    photoId: string
    status: string
    comment?: string
    rating?: number
    clientId: string
  }) {
    // Use existing PhotoFavorite model
    return await prisma.photoFavorite.create({
      data: {
        photoId: data.photoId,
        clientEmail: 'client@demo.com', // Would get from session
        notes: data.comment
      }
    })
  }

  static async updatePhotoSelection(id: string, data: Record<string, unknown>) {
    return await prisma.photoFavorite.update({
      where: { id },
      data: {
        notes: data.comment
      }
    })
  }

  static async getPhotoSelections(sessionId: string) {
    // Note: Would query favorites for the session
    return []
  }

  // Users
  static async createUser(data: {
    email: string
    firstName: string
    lastName: string
    role: 'owner' | 'admin' | 'client'
    passwordHash?: string
  }) {
    return await prisma.user.create({
      data: {
        ...data,
        passwordHash: data.passwordHash || 'temp-hash'
      }
    })
  }

  static async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email }
    })
  }

  static async updateUser(id: string, data: Record<string, unknown>) {
    return await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  // Processing Presets - Using existing LightroomPreset model
  static async createProcessingPreset(data: {
    name: string
    description: string
    settings: Record<string, unknown>
    isPublic: boolean
    createdBy: string
  }) {
    return await prisma.lightroomPreset.create({
      data: {
        name: data.name,
        ownerId: data.createdBy,
        xmpContent: JSON.stringify(data.settings)
      }
    })
  }

  static async getProcessingPresets(userId: string) {
    return await prisma.lightroomPreset.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async updateProcessingPreset(id: string, data: Record<string, unknown>) {
    return await prisma.lightroomPreset.update({
      where: { id },
      data: {
        name: data.name,
        xmpContent: JSON.stringify(data.settings)
      }
    })
  }

  static async deleteProcessingPreset(id: string) {
    return await prisma.lightroomPreset.delete({
      where: { id }
    })
  }
}

// Migration functions
export class DatabaseMigrations {
  static async migrateFromDemoData() {
    console.log('🔄 Starting database migration from demo data...')

    try {
      // Create demo users if they don't exist
      const demoUsers = [
        {
          id: 'demo-user-1',
          email: 'photographer@demo.com',
          firstName: 'Zeth',
          lastName: 'Rivarola',
          role: 'owner' as const,
          passwordHash: 'demo-hash-123'
        },
        {
          id: 'demo-user-2',
          email: 'admin@demo.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin' as const,
          passwordHash: 'demo-hash-123'
        },
        {
          id: 'demo-user-3',
          email: 'client@demo.com',
          firstName: 'Client',
          lastName: 'User',
          role: 'client' as const,
          passwordHash: 'demo-hash-123'
        }
      ]

      for (const user of demoUsers) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: user
        })
      }

      // Create default processing presets
      const defaultPresets = [
        {
          id: 'preset-portrait',
          name: 'Portrait',
          description: 'Optimized for skin tones and natural portraits',
          settings: {
            exposure: 0.2,
            shadows: 30,
            highlights: -20,
            whites: 10,
            blacks: -10,
            vibrance: 15,
            saturation: 0,
            clarity: 10,
            dehaze: 0,
            temperature: 0,
            tint: 5,
            sharpening: 25,
            noiseReduction: 20
          },
          isPublic: true,
          createdBy: 'demo-user-1'
        },
        {
          id: 'preset-landscape',
          name: 'Landscape',
          description: 'Enhanced colors and contrast for landscapes',
          settings: {
            exposure: 0,
            shadows: 20,
            highlights: -30,
            whites: 5,
            blacks: -15,
            vibrance: 25,
            saturation: 10,
            clarity: 25,
            dehaze: 15,
            temperature: -100,
            tint: 0,
            sharpening: 35,
            noiseReduction: 15
          },
          isPublic: true,
          createdBy: 'demo-user-1'
        }
      ]

      for (const preset of defaultPresets) {
        await prisma.lightroomPreset.upsert({
          where: { id: preset.id },
          update: {},
          create: {
            id: preset.id,
            name: preset.name,
            ownerId: preset.createdBy,
            xmpContent: JSON.stringify(preset.settings)
          }
        })
      }

      console.log('✅ Database migration completed successfully!')
      return { success: true, message: 'Migration completed' }

    } catch (error) {
      console.error('❌ Database migration failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  static async seedDemoCollections() {
    console.log('🌱 Seeding demo collections...')

    try {
      const photographer = await prisma.user.findUnique({
        where: { email: 'photographer@demo.com' }
      })

      if (!photographer) {
        throw new Error('Photographer user not found')
      }

      const demoCollections = [
        {
          id: 'collection-1',
          title: 'Team - Florella Talavera',
          description: 'Professional team photoshoot for Florella Talavera',
          slug: 'team-florella-talavera',
          ownerId: photographer.id,
          visibility: 'private' as const,
          isStarred: false,
          isFeatured: false,
          tags: ['team', 'professional']
        },
        {
          id: 'collection-2',
          title: 'Sesión Retratos Jero',
          description: 'Portrait session with Jero',
          slug: 'sesion-retratos-jero',
          ownerId: photographer.id,
          visibility: 'private' as const,
          isStarred: true,
          isFeatured: false,
          tags: ['portraits', 'session']
        }
      ]

      for (const collection of demoCollections) {
        await prisma.collection.upsert({
          where: { id: collection.id },
          update: {},
          create: collection
        })
      }

      console.log('✅ Demo collections seeded successfully!')
      return { success: true, message: 'Collections seeded' }

    } catch (error) {
      console.error('❌ Collection seeding failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Database health check
export async function checkDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return { connected: true }
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return { connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
}
