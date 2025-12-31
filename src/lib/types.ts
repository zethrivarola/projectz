/**
 * Centralized Type Definitions
 * Single source of truth for all types used across the application
 * Based on Prisma schema with transformations for API and Frontend
 */

import { Prisma } from '@prisma/client'

// ============================================================================
// COLLECTION TYPES
// ============================================================================

/**
 * Full Collection type with all relations from Prisma
 * Used internally in API routes
 */
export type CollectionWithRelations = Prisma.CollectionGetPayload<{
  include: {
    coverPhoto: {
      select: {
        id: true
        thumbnailUrl: true
        webUrl: true
      }
    }
    owner: {
      select: {
        id: true
        email: true
        name: true
        role: true
      }
    }
    _count: {
      select: {
        photos: true
      }
    }
  }
}>

/**
 * Collection type for API responses
 * - Dates serialized as ISO strings
 * - BigInt converted to strings
 * - Null converted to undefined for consistency
 */
export interface CollectionApiResponse {
  id: string
  slug: string
  title: string
  description?: string | null
  ownerId?: string | null
  visibility: string
  isStarred: boolean
  isFeatured: boolean
  isVisible: boolean
  tags: string[]
  dateTaken?: string | null
  createdAt: string
  updatedAt: string
  
  // Relations (optional, undefined if not present)
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  owner?: {
    id: string
    email: string
    name: string
    role: string
  }
  coverFocalPoint?: {
    x: number
    y: number
  }
  
  // Computed fields
  _count: {
    photos: number
  }
  totalSizeBytes: string
}

/**
 * Collection type for Frontend components
 * - Dates as Date objects
 * - Null normalized to undefined
 */
export interface CollectionFrontend {
  id: string
  slug: string
  title: string
  description?: string
  ownerId?: string
  visibility: string
  isStarred: boolean
  isFeatured: boolean
  isVisible: boolean
  tags: string[]
  dateTaken?: Date
  createdAt: Date
  updatedAt: Date
  
  // Relations
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  owner?: {
    id: string
    email: string
    name: string
    role: string
  }
  coverFocalPoint?: {
    x: number
    y: number
  }
  
  // Computed fields
  _count: {
    photos: number
  }
  totalSizeBytes: string
}

// ============================================================================
// PHOTO TYPES
// ============================================================================

/**
 * Full Photo type with relations from Prisma
 */
export type PhotoWithRelations = Prisma.PhotoGetPayload<{
  include: {
    collection: {
      select: {
        id: true
        slug: true
        title: true
      }
    }
  }
}>

/**
 * Photo type for API responses
 */
export interface PhotoApiResponse {
  id: string
  collectionId: string
  filename: string
  originalFilename: string
  fileSize: string // BigInt as string
  width?: number | null
  height?: number | null
  isRaw: boolean
  orderIndex: number
  processingStatus: string
  isHidden: boolean
  hiddenBy?: string | null
  hiddenAt?: string | null
  
  // URLs
  thumbnailUrl?: string | null
  webUrl?: string | null
  highResUrl?: string | null
  originalUrl?: string | null
  
  // Timestamps
  createdAt: string
  updatedAt: string
  
  // Relations (optional)
  collection?: {
    id: string
    slug: string
    title: string
  }
}

/**
 * Photo type for Frontend components
 */
export interface PhotoFrontend {
  id: string
  collectionId: string
  filename: string
  originalFilename: string
  fileSize: string
  width?: number
  height?: number
  isRaw: boolean
  orderIndex: number
  processingStatus: string
  isHidden: boolean
  hiddenBy?: string
  hiddenAt?: Date
  
  // URLs
  thumbnailUrl?: string
  webUrl?: string
  highResUrl?: string
  originalUrl?: string
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  
  // Relations
  collection?: {
    id: string
    slug: string
    title: string
  }
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * User type for API responses (no sensitive data)
 */
export interface UserApiResponse {
  id: string
  email: string
  name?: string | null
  role: string
  storageUsedBytes: string
  maxStorageGB: number
  maxCollections: number
  maxPhotosPerCollection: number
  createdAt: string
}

/**
 * User type for Frontend
 */
export interface UserFrontend {
  id: string
  email: string
  name?: string
  role: string
  storageUsedBytes: string
  maxStorageGB: number
  maxCollections: number
  maxPhotosPerCollection: number
  createdAt: Date
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform Prisma Collection to API response format
 * Handles Date serialization and null normalization
 */
export function collectionToApiResponse(
  collection: CollectionWithRelations & { totalSizeBytes?: bigint | string }
): CollectionApiResponse {
  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description,
    ownerId: collection.ownerId,
    visibility: collection.visibility,
    isStarred: collection.isStarred,
    isFeatured: collection.isFeatured,
    isVisible: collection.isVisible,
    tags: collection.tags,
    dateTaken: collection.dateTaken?.toISOString() ?? null,
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
    
    // Relations - convert null to undefined
    coverPhoto: collection.coverPhoto ?? undefined,
    owner: collection.owner ?? undefined,
    coverFocalPoint: collection.coverFocalPoint 
      ? (collection.coverFocalPoint as { x: number; y: number })
      : undefined,
    
    // Computed fields
    _count: collection._count,
    totalSizeBytes: typeof collection.totalSizeBytes === 'bigint'
      ? collection.totalSizeBytes.toString()
      : (collection.totalSizeBytes ?? '0'),
  }
}

/**
 * Transform API response to Frontend format
 * Converts string dates to Date objects
 */
export function apiResponseToFrontend(
  collection: CollectionApiResponse
): CollectionFrontend {
  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    description: collection.description ?? undefined,
    ownerId: collection.ownerId ?? undefined,
    visibility: collection.visibility,
    isStarred: collection.isStarred,
    isFeatured: collection.isFeatured,
    isVisible: collection.isVisible,
    tags: collection.tags,
    dateTaken: collection.dateTaken ? new Date(collection.dateTaken) : undefined,
    createdAt: new Date(collection.createdAt),
    updatedAt: new Date(collection.updatedAt),
    
    // Relations - already normalized to undefined
    coverPhoto: collection.coverPhoto ?? undefined,
    owner: collection.owner ?? undefined,
    coverFocalPoint: collection.coverFocalPoint,
    
    // Computed fields
    _count: collection._count,
    totalSizeBytes: collection.totalSizeBytes,
  }
}

/**
 * Transform Photo for API response
 */
export function photoToApiResponse(photo: PhotoWithRelations): PhotoApiResponse {
  return {
    id: photo.id,
    collectionId: photo.collectionId,
    filename: photo.filename,
    originalFilename: photo.originalFilename,
    fileSize: photo.fileSize.toString(),
    width: photo.width,
    height: photo.height,
    isRaw: photo.isRaw,
    orderIndex: photo.orderIndex,
    processingStatus: photo.processingStatus,
    isHidden: photo.isHidden,
    hiddenBy: photo.hiddenBy,
    hiddenAt: photo.hiddenAt?.toISOString() ?? null,
    
    thumbnailUrl: photo.thumbnailUrl,
    webUrl: photo.webUrl,
    highResUrl: photo.highResUrl,
    originalUrl: photo.originalUrl,
    
    createdAt: photo.createdAt.toISOString(),
    updatedAt: photo.updatedAt.toISOString(),
    
    collection: photo.collection ?? undefined,
  }
}

/**
 * Transform Photo API response to Frontend
 */
export function photoApiToFrontend(photo: PhotoApiResponse): PhotoFrontend {
  return {
    id: photo.id,
    collectionId: photo.collectionId,
    filename: photo.filename,
    originalFilename: photo.originalFilename,
    fileSize: photo.fileSize,
    width: photo.width ?? undefined,
    height: photo.height ?? undefined,
    isRaw: photo.isRaw,
    orderIndex: photo.orderIndex,
    processingStatus: photo.processingStatus,
    isHidden: photo.isHidden,
    hiddenBy: photo.hiddenBy ?? undefined,
    hiddenAt: photo.hiddenAt ? new Date(photo.hiddenAt) : undefined,
    
    thumbnailUrl: photo.thumbnailUrl ?? undefined,
    webUrl: photo.webUrl ?? undefined,
    highResUrl: photo.highResUrl ?? undefined,
    originalUrl: photo.originalUrl ?? undefined,
    
    createdAt: new Date(photo.createdAt),
    updatedAt: new Date(photo.updatedAt),
    
    collection: photo.collection,
  }
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pagination response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string
  details?: unknown
}

/**
 * API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
}

// ============================================================================
// LEGACY COMPATIBILITY (for gradual migration)
// ============================================================================

/**
 * @deprecated Use CollectionFrontend instead
 */
export type Collection = CollectionFrontend

/**
 * @deprecated Use PhotoFrontend instead
 */
export type Photo = PhotoFrontend
