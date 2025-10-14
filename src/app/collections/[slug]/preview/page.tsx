"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Eye,
  Settings,
  Camera
} from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  gridStyle?: string
  gridColumns?: number
  thumbnailSize?: string
  gridSpacing?: string
  typographyStyle?: string
  colorTheme?: string
  coverFocalPoint?: {
    x: number
    y: number
  }
  // NUEVOS
  coverLayout?: string
  titleSize?: number
  titleColor?: string
  customBackgroundColor?: string
  customAccentColor?: string
  _count: {
    photos: number
  }
}

interface Photo {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  originalUrl: string
}

export default function CollectionPreviewPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCollection = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token') // CORREGIDO

      console.log('🔍 Fetching preview for:', slug)

      const response = await fetch(`/api/collections/${slug}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collection')
      }

      const data = await response.json()
      console.log('✅ Preview data loaded:', data)
      
      setCollection(data.collection)
      setPhotos(data.photos || [])

    } catch (error) {
      console.error('❌ Error fetching collection:', error)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (params.slug) {
      fetchCollection()
    }
  }, [params.slug, fetchCollection])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Collection Not Found</h2>
          <Link href="/collections">
            <Button variant="outline">Back to Collections</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Usar los valores guardados en la BD
const gridColumns = collection.gridColumns || 4
const gridSpacing = parseInt(collection.gridSpacing || '12')
const titleFont = collection.typographyStyle || 'Playfair Display'
const titleSize = collection.titleSize || 48
const titleColor = collection.titleColor || '#ffffff'
const backgroundColor = collection.customBackgroundColor || (collection.colorTheme === 'dark' ? '#1a1a1a' : '#ffffff')
const accentColor = collection.customAccentColor || (collection.colorTheme === 'dark' ? '#d4af37' : '#000000')
const coverLayout = collection.coverLayout || 'center'
const focusX = collection.coverFocalPoint?.x || 50
const focusY = collection.coverFocalPoint?.y || 50

console.log('Preview usando:', {
  gridColumns,
  gridSpacing,
  titleFont,
  titleSize,
  backgroundColor,
  coverLayout
})

  return (
    <div className="min-h-screen">
      {/* Preview Controls */}
      <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur rounded-lg p-3 text-white">
        <div className="flex items-center gap-3 text-sm">
          <Eye className="h-4 w-4" />
          <span>Preview Mode</span>
        </div>
      </div>

      {/* Exit Preview Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Link href={`/collections/${collection.slug}/design`}>
          <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur">
            <Settings className="h-4 w-4 mr-2" />
            Edit Design
          </Button>
        </Link>
        <Link href={`/collections/${collection.slug}`}>
          <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit Preview
          </Button>
        </Link>
      </div>

      {/* Full-Screen Cover Section */}
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor }}
      >
        {collection.coverPhoto ? (
          <img
            src={collection.coverPhoto.webUrl}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${focusX}% ${focusY}%`
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-muted-foreground"
            style={{ backgroundColor }}
          >
            <Camera className="h-24 w-24 opacity-20" />
          </div>
        )}

        {/* Cover Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Title and Content */}
<div
  className={`relative z-10 ${
    coverLayout === 'center' ? 'text-center' : ''
  } ${
    coverLayout === 'left' ? 'text-left max-w-2xl mx-auto px-12' : ''
  } ${
    coverLayout === 'novel' ? 'text-center max-w-xl mx-auto' : ''
  }`}
>
  <h1
    className="font-bold tracking-wide mb-8"
    style={{
      fontFamily: titleFont,
      fontSize: `${titleSize}px`,
      color: titleColor
    }}
  >
    {collection.title.toUpperCase()}
  </h1>

          <div className="mt-12">
            <p className="text-white/80 text-sm tracking-wider">
              RENÉ RIVAROLA PHOTOGRAPHY
            </p>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="text-white/60 text-center">
            <div className="w-6 h-10 border-2 border-white/40 rounded-full mx-auto mb-2">
              <div className="w-1 h-3 bg-white/60 rounded-full mx-auto mt-2 animate-pulse"></div>
            </div>
            <p className="text-xs">Scroll to view gallery</p>
          </div>
        </div>
      </div>

      {/* Photo Gallery Section */}
<div
  className="min-h-screen py-8 sm:py-12 lg:py-16"
  style={{ backgroundColor }}
>
  {/* Gallery Header */}
  <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 mb-8 sm:mb-12">
    <div className="text-center max-w-4xl mx-auto">
      <h2
        className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4"
        style={{
          fontFamily: titleFont,
          color: accentColor
        }}
      >
        {collection.title.toUpperCase()}
      </h2>
      <p className="text-sm sm:text-base text-muted-foreground">
        RENÉ RIVAROLA PHOTOGRAPHY
      </p>
    </div>
  </div>

  {/* Photo Grid - Responsive */}
  <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
    <div className={`mx-auto ${
      // Ancho máximo según número de columnas
      gridColumns <= 2 ? 'max-w-3xl' :
      gridColumns === 3 ? 'max-w-5xl' :
      gridColumns === 4 ? 'max-w-6xl' :
      gridColumns === 5 ? 'max-w-7xl' :
      'max-w-[1800px]'
    }`}>
      {photos.length > 0 ? (
        <div
          className={`
            grid
            gap-2 sm:gap-3 md:gap-4
            ${
              // Grid responsivo basado en el número de columnas configurado
              gridColumns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
              gridColumns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
              gridColumns === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
              gridColumns === 5 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' :
              gridColumns === 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' :
              'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            }
          `}
          style={{
            gap: `${gridSpacing}px`
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="aspect-square bg-muted rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
            >
              <img
                src={photo.webUrl}
                alt={photo.originalFilename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 sm:py-16">
          <div className="text-muted-foreground">
            <Camera className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
            <p className="text-base sm:text-lg">No photos in this collection yet</p>
            <p className="text-xs sm:text-sm mt-2">Photos will appear here once uploaded</p>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Footer */}
  <div className="border-t border-border bg-muted/30 py-6 sm:py-8 mt-12 sm:mt-16">
    <div className="w-full px-4 sm:px-6 lg:px-8 text-center">
      <p className="text-xs sm:text-sm text-muted-foreground">
        © 2024 RENÉ RIVAROLA PHOTOGRAPHY
      </p>
    </div>
  </div>
</div>
    </div>
  )
}