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
      const token = localStorage.getItem('auth-token')

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
      setCollection(data.collection)
      setPhotos(data.photos || [])

    } catch (error) {
      console.error('Error fetching collection:', error)
    } finally {
      setLoading(false)
    }
  }, [slug, setLoading, setCollection, setPhotos]);

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

  const design = collection.design || {
    coverLayout: 'center',
    typography: {
      titleFont: 'Inter',
      titleSize: 48,
      titleColor: '#ffffff'
    },
    colors: {
      background: '#ffffff',
      accent: '#000000'
    },
    grid: {
      columns: 4,
      spacing: 8
    },
    coverFocus: {
      x: 50,
      y: 50
    }
  }

  return (
    <div className="min-h-screen">
      {/* Preview Controls - Owner Only */}
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
        style={{ backgroundColor: design.colors.background }}
      >
        {collection.coverPhoto ? (
          <img
            src={collection.coverPhoto.webUrl}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${design.coverFocus.x}% ${design.coverFocus.y}%`
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-muted-foreground"
            style={{ backgroundColor: design.colors.background }}
          >
            <Camera className="h-24 w-24 opacity-20" />
          </div>
        )}

        {/* Cover Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Title and Content */}
        <div
          className={`relative z-10 text-center ${
            design.coverLayout === 'left' ? 'text-left max-w-2xl mx-auto' : ''
          }`}
        >
          <h1
            className="font-bold tracking-wide mb-8"
            style={{
              fontFamily: design.typography.titleFont,
              fontSize: `${design.typography.titleSize}px`,
              color: design.typography.titleColor
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
        className="min-h-screen py-16"
        style={{ backgroundColor: design.colors.background }}
      >
        {/* Gallery Header */}
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <div className="text-center">
            <h2
              className="text-3xl font-bold mb-4"
              style={{
                fontFamily: design.typography.titleFont,
                color: design.colors.accent
              }}
            >
              {collection.title.toUpperCase()}
            </h2>
            <p className="text-muted-foreground">
              RENÉ RIVAROLA PHOTOGRAPHY
            </p>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="max-w-6xl mx-auto px-6">
          {photos.length > 0 ? (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${design.grid.columns}, 1fr)`,
                gap: `${design.grid.spacing}px`
              }}
            >
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square bg-muted rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  <img
                    src={photo.webUrl}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-muted-foreground">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No photos in this collection yet</p>
                <p className="text-sm mt-2">Photos will appear here once uploaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 py-8 mt-16">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 RENÉ RIVAROLA PHOTOGRAPHY
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
