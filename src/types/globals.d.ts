/* eslint-disable no-var */
import { Collection, Photo } from '@/lib/types'

declare global {
  var demoCollections: Map<string, Collection> | undefined
  var demoPhotos: Map<string, Photo> | undefined
}

export {};
