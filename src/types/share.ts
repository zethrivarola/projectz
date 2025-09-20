export interface Share {
  id: string
  shareToken: string
  collectionId: string
  collectionSlug: string
  visibility: string
  password: string | null
  expiresAt: Date | null
  message: string
  createdAt: Date
  createdBy: string
  accessCount: number
  lastAccessedAt: Date | null
}