export interface Share {
  shareToken: string
  collectionId: string
  createdAt?: Date      // si tu storage guarda fecha de creación
  ownerId?: string      // opcional, si existe
  permissions?: string  // opcional, si existe
  [key: string]: unknown
}
