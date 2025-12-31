"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Camera, Loader2, ArrowLeft, Settings, Share2, Trash2 } from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  isFeatured: boolean
  tags: string[]
  visibility: string
  createdAt: Date
  updatedAt: Date
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  coverFocalPoint?: {
    x: number
    y: number
  }
  _count: {
    photos: number
  }
}

export default function StarredPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [authChecked, setAuthChecked] = useState(false)

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth-token')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  const fetchStarredCollections = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

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

      // Fetch all collections and filter featured ones
      const response = await fetch('/api/collections', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch collections (${response.status})`)
      }

      const data = await response.json()
      // Filter only featured collections
      const featuredCollections = data.collections.filter((c: Collection) => c.isFeatured === true)
      setCollections(featuredCollections)

    } catch (error) {
      console.error('Error fetching featured collections:', error)
      setError(error instanceof Error ? error.message : 'Failed to load featured collections')
    } finally {
      setLoading(false)
    }
  }, [router, getAuthHeaders])

  useEffect(() => {
    fetchStarredCollections()
  }, [fetchStarredCollections])

  const handleToggleStar = async (collection: Collection) => {
    try {
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ isFeatured: !collection.isFeatured })
      })

      if (!response.ok) {
        throw new Error('Failed to update collection')
      }

      // Remove from featured list (since we're toggling it off)
      setCollections(prev => prev.filter(c => c.id !== collection.id))
    } catch (error) {
      console.error('Error toggling star:', error)
      alert('Failed to update collection')
    }
  }

  const handleDeleteCollection = async (collection: Collection) => {
    if (!confirm(`Are you sure you want to delete "${collection.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete collection')
      }

      setCollections(prev => prev.filter(c => c.id !== collection.id))
    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Failed to delete collection.')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusText = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Public'
      case 'password_protected':
        return 'Protected'
      case 'private':
        return 'Private'
      default:
        return 'Unknown'
    }
  }

  if (!authChecked && loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking authentication...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading featured collections...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              <h1 className="text-2xl font-semibold text-foreground">Starred Collections</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {collections.length} {collections.length === 1 ? 'collection' : 'collections'} marked as important
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error loading collections</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchStarredCollections}>Retry</Button>
              </div>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                  <Star className="h-12 w-12 text-muted-foreground opacity-50" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">You have no featured collections yet</h2>
                <p className="text-muted-foreground mb-6">Track your favorite collections with stars.</p>
                <Link href="/admin">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <Card
                    key={collection.id}
                    className="hover:shadow-lg transition-shadow overflow-hidden group cursor-pointer"
                    onClick={() => router.push(`/admin/collections/${collection.slug}`)}
                  >
                    <div className="relative h-64 bg-muted overflow-hidden">
                      {collection.coverPhoto ? (
                        <img
                          src={collection.coverPhoto.webUrl}
                          alt={collection.title}
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${collection.coverFocalPoint?.x || 50}% ${collection.coverFocalPoint?.y || 50}%`
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStar(collection)
                        }}
                        title="Remove from featured"
                        className="absolute top-3 left-3 z-10"
                      >
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      </Button>
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle
                            className="text-lg line-clamp-2 cursor-pointer hover:text-primary"
                            onClick={() => router.push(`/admin/collections/${collection.slug}`)}
                          >
                            {collection.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {collection._count.photos} photos
                          </p>
                        </div>
                        <Badge variant="outline">{getStatusText(collection.visibility)}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {collection.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {collection.description}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Created {formatDate(collection.createdAt)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/admin/collections/${collection.slug}/preview`, '_blank')
                          }}
                          className="gap-1"
                        >
                          <Settings className="h-3 w-3" />
                          <span className="hidden sm:inline">Preview</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCollection(collection)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}