"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Camera, Calendar, Tag, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
  isFeatured: boolean
  tags: string[]
  dateTaken?: Date
  createdAt: Date
  coverFocalPoint?: {
    x: number
    y: number
  }
  _count: {
    photos: number
  }
}

export default function HomePage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections/public')
      
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }

      const data = await response.json()
      setCollections(data.collections)
    } catch (error) {
      console.error('Error:', error)
      setError('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading collections...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading collections</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                  RENÉ RIVAROLA
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground tracking-wider">
                  PHOTOGRAPHY
                </p>
              </div>
            </Link>
            
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
            Photography Collections
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Explore my curated photography collections capturing moments, stories, and emotions
          </p>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          {collections.length === 0 ? (
            <div className="text-center py-16 sm:py-24">
              <Camera className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">No collections available</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Check back soon for new photography collections
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {collections.map((collection) => {
                const focusX = collection.coverFocalPoint?.x ?? 50
                const focusY = collection.coverFocalPoint?.y ?? 50

                return (
                  <Link
                    key={collection.id}
                    href={`/collections/${collection.slug}`}
                    className="group"
                  >
                    <article className="bg-card rounded-lg overflow-hidden border border-border hover:shadow-xl transition-all duration-300">
                      {/* Cover Image */}
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {collection.coverPhoto ? (
                          <img
                            src={collection.coverPhoto.webUrl}
                            alt={collection.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            style={{
                              objectPosition: `${focusX}% ${focusY}%`
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Featured Badge */}
                        {collection.isFeatured && (
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-primary/90 backdrop-blur text-primary-foreground">
                              Featured
                            </Badge>
                          </div>
                        )}

                        {/* Overlay on Hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      </div>

                      {/* Content */}
                      <div className="p-4 sm:p-5">
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {collection.title}
                        </h3>
                        
                        {collection.description && (
                          <p className="text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                            {collection.description}
                          </p>
                        )}

                        {/* Meta Information */}
                        <div className="flex flex-col gap-2 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span>{collection._count.photos} photos</span>
                          </div>
                          
                          {collection.dateTaken && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              <span>{formatDate(collection.dateTaken)}</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        {collection.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-4">
                            {collection.tags.slice(0, 3).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {collection.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{collection.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8 sm:py-12 mt-12 sm:mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} René Rivarola Photography. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
