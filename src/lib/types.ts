export interface Collection {
  id: string
  slug: string
  title: string
  ownerId: string
  [key: string]: unknown
}

export interface Photo {
  id: string
  collectionId: string
  filename: string
  [key: string]: unknown
}
