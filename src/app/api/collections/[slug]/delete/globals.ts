import { Collection, Photo } from '@/lib/types'

// Inicializar variables globales si no existen
if (!globalThis.demoCollections) {
  globalThis.demoCollections = new Map<string, Collection>()
}

if (!globalThis.demoPhotos) {
  globalThis.demoPhotos = new Map<string, Photo>()
}

// Exportar para usar en route.ts
export const demoCollections = globalThis.demoCollections
export const demoPhotos = globalThis.demoPhotos
