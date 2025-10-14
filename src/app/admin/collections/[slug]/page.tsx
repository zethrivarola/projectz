"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Heart,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  Check,
  Settings,
  Edit,
  Download
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
  highResUrl: string
  originalUrl: string
}

export default function AdminCollectionPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [collection, setCollection] = useState<Collection | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth-token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, [])

  const fetchCollection = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Check authentication first
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      setAuthChecked(true)

      const response = await fetch(`/api/collections/${slug}`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Collection not found')
        }
        if (response.status === 403) {
          throw new Error('Access denied')
        }
        throw new Error('Failed to load collection')
      }

      const data = await response.json()
      setCollection(data.collection)
      setPhotos(data.photos || [])

    } catch (err) {
      console.error('Error fetching collection:', err)
      setError(err instanceof Error ? err.message : 'Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [slug, router, getAuthHeaders])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  const toggleFavorite = (photoId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId)
    } else {
      newFavorites.add(photoId)
    }
    setFavorites(newFavorites)
  }

  if (!authChecked && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Checking authentication...</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Loading collection...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !collection) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <Camera className="h-16 w-16 mx-auto opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Collection Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'This collection could not be loaded.'}
            </p>
            <Link href="/admin">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
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
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        {/* Portada */}
        <section 
          className="h-96 flex items-center justify-center relative overflow-hidden"
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
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Camera className="h-24 w-24 opacity-20" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/40"></div>

          <div className="absolute top-6 left-6 z-20">
            <Link href="/admin">
              <Button size="sm" variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <div className="relative z-10 text-center">
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

            <div className="mb-6">
              <p className="text-white/80 text-sm tracking-wider">
                RENE RIVAROLA PHOTOGRAPHY
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <Link href={`/admin/collections/${slug}/design`}>
                <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                  <Settings className="h-4 w-4 mr-2" />
                  Design
                </Button>
              </Link>
              <Link href={`/admin/collections/${slug}`}>
                <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                  <Edit className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Header Admin */}
        <div className="border-b border-border bg-background/95 backdrop-blur p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <h2 className="text-xl font-bold">{collection.title}</h2>
              <p className="text-sm text-muted-foreground">{photos.length} photos</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/collections/${slug}/design`}>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Design
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Grilla Admin */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {photos.length > 0 ? (
              <div className="grid w-full" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`, gap: '16px' }}>
                {photos.map((photo) => {
                  const isFavorite = favorites.has(photo.id)
                  
                  return (
                    <Card key={photo.id} className="overflow-hidden hover:shadow-lg transition-all">
                      <div className="relative aspect-square bg-muted overflow-hidden group">
                        <img 
                          src={photo.thumbnailUrl} 
                          alt={photo.originalFilename} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        
                        {isFavorite && (
                          <div className="absolute top-3 left-3 z-10">
                            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                          </div>
                        )}

                        <div className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-8 w-8 p-0 ${
                              isFavorite 
                                ? 'bg-red-500 text-white' 
                                : 'bg-white/90'
                            }`}
                            onClick={() => toggleFavorite(photo.id)}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="pt-3">
                        <p className="text-xs text-muted-foreground truncate">
                          {photo.originalFilename}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">No photos in this collection</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}