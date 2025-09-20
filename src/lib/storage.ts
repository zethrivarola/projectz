import fs from 'fs/promises'
import path from 'path'

const STORAGE_DIR = process.env.STORAGE_DIR || './data'
const COLLECTIONS_FILE = path.join(STORAGE_DIR, 'collections.json')
const PHOTOS_FILE = path.join(STORAGE_DIR, 'photos.json')
const SHARES_FILE = path.join(STORAGE_DIR, 'shares.json')
const FAVORITES_FILE = path.join(STORAGE_DIR, 'favorites.json')

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
  photoCount: number
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  design?: {
    coverLayout: string
    typography: {
      titleFont: string
      titleSize: number
      titleColor: string
    }
    colors: {
      background: string
      accent: string
    }
    grid: {
      columns: number
      spacing: number
    }
    coverFocus: {
      x: number
      y: number
    }
  }
}

interface Photo {
  id: string
  filename: string
  originalFilename: string
  collectionId: string
  orderIndex: number
  thumbnailUrl: string
  webUrl: string
  highResUrl?: string
  originalUrl: string
  width: number
  height: number
  isRaw: boolean
  processingStatus: string
  uploadedAt: Date
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface Share {
  id: string
  shareToken: string
  collectionId: string
  collectionSlug: string
  visibility: string
  password?: string
  expiresAt?: Date
  message?: string
  createdAt: Date
  createdBy: string
  accessCount: number
  lastAccessedAt?: Date
}

interface FavoriteSession {
  id: string
  shareToken: string
  collectionId: string
  clientIdentifier: string
  clientInfo?: {
    userAgent: string
    ip: string
    country?: string
  }
  createdAt: Date
  lastUpdatedAt: Date
  favoritePhotoIds: string[]
  totalFavorites: number
}

interface FavoriteAnalytics {
  photoId: string
  collectionId: string
  totalFavorites: number
  favoriteSessions: {
    sessionId: string
    clientIdentifier: string
    addedAt: Date
  }[]
  lastFavoritedAt: Date
}

class PersistentStorage {
  private collections: Map<string, Collection> = new Map()
  private photos: Map<string, Photo> = new Map()
  private shares: Map<string, Share> = new Map()
  private favoriteSessions: Map<string, FavoriteSession> = new Map()
  private favoriteAnalytics: Map<string, FavoriteAnalytics> = new Map()
  private initialized = false

  async ensureStorageDir() {
    try {
      await fs.mkdir(STORAGE_DIR, { recursive: true })
    } catch (error) {
      console.error('Failed to create storage directory:', error)
    }
  }

  async loadData() {
    if (this.initialized) return

    await this.ensureStorageDir()

    try {
      // Load collections
      try {
        const collectionsData = await fs.readFile(COLLECTIONS_FILE, 'utf-8')
        const collectionsArray = JSON.parse(collectionsData) as Collection[]
        this.collections = new Map(collectionsArray.map((c: Collection) => [c.id, {
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        }]))
        console.log(`📁 Loaded ${this.collections.size} collections from storage`)
      } catch (error) {
        console.log('📁 No existing collections found, starting fresh')
        this.collections = new Map()
      }

      // Load photos
      try {
        const photosData = await fs.readFile(PHOTOS_FILE, 'utf-8')
        const photosArray = JSON.parse(photosData) as Photo[]
        this.photos = new Map(photosArray.map((p: Photo) => [p.id, {
          ...p,
          uploadedAt: new Date(p.uploadedAt),
          createdAt: new Date(p.createdAt)
        }]))
        console.log(`📸 Loaded ${this.photos.size} photos from storage`)
      } catch (error) {
        console.log('📸 No existing photos found, starting fresh')
        this.photos = new Map()
      }

      // Load shares
      try {
        const sharesData = await fs.readFile(SHARES_FILE, 'utf-8')
        const sharesArray = JSON.parse(sharesData) as Share[]
        this.shares = new Map(sharesArray.map((s: Share) => [s.shareToken, {
          ...s,
          createdAt: new Date(s.createdAt),
          expiresAt: s.expiresAt ? new Date(s.expiresAt) : undefined,
          lastAccessedAt: s.lastAccessedAt ? new Date(s.lastAccessedAt) : undefined
        }]))
        console.log(`🔗 Loaded ${this.shares.size} shares from storage`)
      } catch (error) {
        console.log('🔗 No existing shares found, starting fresh')
        this.shares = new Map()
      }

      // Load favorites
      try {
        const favoritesData = await fs.readFile(FAVORITES_FILE, 'utf-8')
        const favoritesObj = JSON.parse(favoritesData) as {
          sessions: FavoriteSession[]
          analytics: FavoriteAnalytics[]
        }
        
        // Load favorite sessions
        const sessionsArray = favoritesObj.sessions || []
        this.favoriteSessions = new Map(sessionsArray.map((s: FavoriteSession) => [s.id, {
          ...s,
          createdAt: new Date(s.createdAt),
          lastUpdatedAt: new Date(s.lastUpdatedAt)
        }]))

        // Load favorite analytics
        const analyticsArray = favoritesObj.analytics || []
        this.favoriteAnalytics = new Map(analyticsArray.map((a: FavoriteAnalytics) => [a.photoId, {
          ...a,
          lastFavoritedAt: new Date(a.lastFavoritedAt),
          favoriteSessions: a.favoriteSessions.map(fs => ({
            ...fs,
            addedAt: new Date(fs.addedAt)
          }))
        }]))

        console.log(`❤️ Loaded ${this.favoriteSessions.size} favorite sessions and ${this.favoriteAnalytics.size} photo analytics from storage`)
      } catch (error) {
        console.log('❤️ No existing favorites found, starting fresh')
        this.favoriteSessions = new Map()
        this.favoriteAnalytics = new Map()
      }

      this.initialized = true
    } catch (error) {
      console.error('Failed to load data from storage:', error)
      this.collections = new Map()
      this.photos = new Map()
      this.shares = new Map()
      this.favoriteSessions = new Map()
      this.favoriteAnalytics = new Map()
      this.initialized = true
    }
  }

  async saveData() {
    await this.ensureStorageDir()

    try {
      // Save collections
      const collectionsArray = Array.from(this.collections.values())
      await fs.writeFile(COLLECTIONS_FILE, JSON.stringify(collectionsArray, null, 2))

      // Save photos
      const photosArray = Array.from(this.photos.values())
      await fs.writeFile(PHOTOS_FILE, JSON.stringify(photosArray, null, 2))

      // Save shares
      const sharesArray = Array.from(this.shares.values())
      await fs.writeFile(SHARES_FILE, JSON.stringify(sharesArray, null, 2))

      // Save favorites
      const favoritesData = {
        sessions: Array.from(this.favoriteSessions.values()),
        analytics: Array.from(this.favoriteAnalytics.values())
      }
      await fs.writeFile(FAVORITES_FILE, JSON.stringify(favoritesData, null, 2))

      console.log(`💾 Saved ${collectionsArray.length} collections, ${photosArray.length} photos, ${sharesArray.length} shares, and ${this.favoriteSessions.size} favorite sessions to storage`)
    } catch (error) {
      console.error('Failed to save data to storage:', error)
    }
  }

  // Original methods
  async getCollections(): Promise<Map<string, Collection>> {
    await this.loadData()
    return this.collections
  }

  async getPhotos(): Promise<Map<string, Photo>> {
    await this.loadData()
    return this.photos
  }

  async getShares(): Promise<Map<string, Share>> {
    await this.loadData()
    return this.shares
  }

  async setCollection(id: string, collection: Collection) {
    await this.loadData()
    this.collections.set(id, collection)
    await this.saveData()
  }

  async setPhoto(id: string, photo: Photo) {
    await this.loadData()
    this.photos.set(id, photo)
    await this.saveData()
  }

  async setShare(shareToken: string, share: Share) {
    await this.loadData()
    this.shares.set(shareToken, share)
    await this.saveData()
  }

  async deleteCollection(id: string) {
    await this.loadData()
    this.collections.delete(id)
    await this.saveData()
  }

  async deletePhoto(id: string) {
    await this.loadData()
    this.photos.delete(id)
    await this.saveData()
  }

  async deleteShare(shareToken: string) {
    await this.loadData()
    this.shares.delete(shareToken)
    await this.saveData()
  }

  async updateCollection(id: string, updates: Partial<Collection>) {
    await this.loadData()
    const existing = this.collections.get(id)
    if (existing) {
      this.collections.set(id, { ...existing, ...updates, updatedAt: new Date() })
      await this.saveData()
    }
  }

  // FAVORITES METHODS

  async getFavoriteSessions(): Promise<Map<string, FavoriteSession>> {
    await this.loadData()
    return this.favoriteSessions
  }

  async getFavoriteAnalytics(): Promise<Map<string, FavoriteAnalytics>> {
    await this.loadData()
    return this.favoriteAnalytics
  }

  async updateFavorites(
    shareToken: string,
    clientIdentifier: string,
    photoId: string,
    action: 'add' | 'remove',
    clientInfo?: { userAgent: string; ip: string; country?: string }
  ) {
    await this.loadData()

    const share = this.shares.get(shareToken)
    if (!share) {
      throw new Error('Share not found')
    }

    // Generate session ID
    const sessionId = `${shareToken}_${clientIdentifier}`

    // Get or create favorite session
    let session = this.favoriteSessions.get(sessionId)
    if (!session) {
      session = {
        id: sessionId,
        shareToken,
        collectionId: share.collectionId,
        clientIdentifier,
        clientInfo,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        favoritePhotoIds: [],
        totalFavorites: 0
      }
    }

    // Update session
    if (action === 'add') {
      if (!session.favoritePhotoIds.includes(photoId)) {
        session.favoritePhotoIds.push(photoId)
        session.totalFavorites = session.favoritePhotoIds.length
        session.lastUpdatedAt = new Date()
      }
    } else {
      session.favoritePhotoIds = session.favoritePhotoIds.filter(id => id !== photoId)
      session.totalFavorites = session.favoritePhotoIds.length
      session.lastUpdatedAt = new Date()
    }

    this.favoriteSessions.set(sessionId, session)

    // Update photo analytics
    let analytics = this.favoriteAnalytics.get(photoId)
    if (!analytics) {
      analytics = {
        photoId,
        collectionId: share.collectionId,
        totalFavorites: 0,
        favoriteSessions: [],
        lastFavoritedAt: new Date()
      }
    }

    if (action === 'add') {
      // Add or update session in analytics
      const existingSessionIndex = analytics.favoriteSessions.findIndex(
        fs => fs.sessionId === sessionId
      )
      
      if (existingSessionIndex === -1) {
        analytics.favoriteSessions.push({
          sessionId,
          clientIdentifier,
          addedAt: new Date()
        })
      }
      analytics.lastFavoritedAt = new Date()
    } else {
      // Remove session from analytics
      analytics.favoriteSessions = analytics.favoriteSessions.filter(
        fs => fs.sessionId !== sessionId
      )
    }

    analytics.totalFavorites = analytics.favoriteSessions.length
    this.favoriteAnalytics.set(photoId, analytics)

    await this.saveData()

    return session
  }

  async getCollectionFavoriteAnalytics(collectionId: string) {
    await this.loadData()

    const analytics = Array.from(this.favoriteAnalytics.values())
      .filter(a => a.collectionId === collectionId)
      .sort((a, b) => b.totalFavorites - a.totalFavorites)

    const sessions = Array.from(this.favoriteSessions.values())
      .filter(s => s.collectionId === collectionId)

    return {
      photoAnalytics: analytics,
      totalSessions: sessions.length,
      totalFavorites: analytics.reduce((sum, a) => sum + a.totalFavorites, 0),
      mostFavoritedPhoto: analytics[0] || null,
      recentSessions: sessions
        .sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime())
        .slice(0, 10)
    }
  }

  async getShareFavorites(shareToken: string) {
    await this.loadData()

    const sessions = Array.from(this.favoriteSessions.values())
      .filter(s => s.shareToken === shareToken)

    const allFavoritePhotoIds = new Set<string>()
    sessions.forEach(session => {
      session.favoritePhotoIds.forEach(photoId => allFavoritePhotoIds.add(photoId))
    })

    const photoAnalytics = Array.from(allFavoritePhotoIds).map(photoId => {
      const analytics = this.favoriteAnalytics.get(photoId)
      return {
        photoId,
        totalFavorites: analytics?.totalFavorites || 0,
        lastFavoritedAt: analytics?.lastFavoritedAt || new Date()
      }
    }).sort((a, b) => b.totalFavorites - a.totalFavorites)

    return {
      sessions,
      totalSessions: sessions.length,
      photoAnalytics,
      totalUniqueFavorites: allFavoritePhotoIds.size
    }
  }

  async clearOldFavoriteSessions(daysOld = 30) {
    await this.loadData()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    let removedCount = 0
    
    // Remove old sessions
    for (const [sessionId, session] of this.favoriteSessions.entries()) {
      if (session.lastUpdatedAt < cutoffDate) {
        this.favoriteSessions.delete(sessionId)
        removedCount++

        // Clean up analytics
        for (const photoId of session.favoritePhotoIds) {
          const analytics = this.favoriteAnalytics.get(photoId)
          if (analytics) {
            analytics.favoriteSessions = analytics.favoriteSessions.filter(
              fs => fs.sessionId !== sessionId
            )
            analytics.totalFavorites = analytics.favoriteSessions.length

            if (analytics.totalFavorites === 0) {
              this.favoriteAnalytics.delete(photoId)
            } else {
              this.favoriteAnalytics.set(photoId, analytics)
            }
          }
        }
      }
    }

    if (removedCount > 0) {
      await this.saveData()
      console.log(`🧹 Cleaned up ${removedCount} old favorite sessions`)
    }

    return removedCount
  }
}

export const storage = new PersistentStorage()