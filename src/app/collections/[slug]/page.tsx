"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { ShareCollectionDialog } from "@/components/share-collection-dialog"
import { RawProcessorInterface } from "@/components/raw-processor-interface"
import { PhotoGallery } from "@/components/photo-gallery"
import { PhotoManagement } from "@/components/photo-management"
import { CoverPhotoSelector } from "@/components/cover-photo-selector"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  Grid3x3,
  List,
  Plus,
  Settings,
  Download,
  Star,
  Camera,
  Zap,
  Loader2,
  Eye,
  Clock,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  visibility: string
  isStarred: boolean
  isFeatured: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
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
  aspectRatio?: string
  width?: number
  height?: number
  isRaw: boolean
  rawFormat?: string
  processingStatus: string
  collectionId: string
  orderIndex: number
  createdAt: Date
  uploadedAt?: Date
  metadata?: Record<string, unknown>
}

export default function CollectionDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showRawProcessor, setShowRawProcessor] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [showBatchProcessor, setShowBatchProcessor] = useState(false)
  const [activeTab, setActiveTab] = useState<"view" | "manage">("view")
  const [showCoverSelector, setShowCoverSelector] = useState(false)
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  // Get design settings with defaults
  const getDesignSettings = () => {
    const defaultDesign = {
      coverLayout: 'center',
      typography: {
        titleFont: 'Playfair Display',
        titleSize: 48,
        titleColor: '#ffffff'
      },
      colors: {
        background: '#ffffff',
        accent: '#000000'
      },
      grid: {
        columns: 4,
        spacing: 12
      },
      coverFocus: {
        x: 50,
        y: 50
      }
    }

    return collection?.design || defaultDesign
  }

  useEffect(() => {
    if (params.slug) {
      fetchCollection()
    }
  }, [params.slug, fetchCollection])

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

  const fetchCollection = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      console.log(`Fetching collection: ${slug}`)

      const response = await fetch(`/api/collections/${slug}`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      console.log(`Collection response status: ${response.status}`)

      if (response.status === 401) {
        console.log('Authentication failed, redirecting to login')
        router.push('/login')
        return
      }

      if (response.status === 404) {
        setError('Collection not found')
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch collection (${response.status})`)
      }

      const data = await response.json()
      setCollection(data.collection)
      setPhotos(data.photos || [])

      console.log(`Collection loaded: ${data.collection.title} with ${data.photos?.length || 0} photos`)
      if (data.collection.design) {
        console.log('Design settings loaded:', data.collection.design)
      }

    } catch (error) {
      console.error('Error fetching collection:', error)
      setError(error instanceof Error ? error.message : 'Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [slug, router, setLoading, setError, setCollection, setPhotos, getAuthHeaders]);

  const handlePhotoClick = (photo: Photo) => {
    if (selectionMode) {
      togglePhotoSelection(photo.id)
      return
    }
    
    const photoIndex = photos.findIndex(p => p.id === photo.id)
    setCurrentPhotoIndex(photoIndex)
    setSelectedPhoto(photo)
    setShowGallery(true)
  }

  // Selection mode functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedPhotos(new Set())
    }
  }

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId)
    } else {
      newSelected.add(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const selectAllPhotos = () => {
    const allPhotoIds = new Set(photos.map(p => p.id))
    setSelectedPhotos(allPhotoIds)
  }

  const deselectAllPhotos = () => {
    setSelectedPhotos(new Set())
  }

  const handleBulkDelete = async () => {
    if (!collection || selectedPhotos.size === 0) {
      return
    }

    const photoCount = selectedPhotos.size
    const photoText = photoCount === 1 ? 'photo' : 'photos'

    if (!confirm(`Are you sure you want to delete ${photoCount} ${photoText}? This action cannot be undone.`)) {
      return
    }

    setBulkDeleteLoading(true)

    try {
      console.log(`Bulk deleting ${photoCount} photos from collection: ${collection.slug}`)
      
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }

      // Use the enhanced DELETE endpoint that accepts photoIds in body
      const response = await fetch(`/api/collections/${collection.slug}/photos/bulk`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          photoIds: Array.from(selectedPhotos)
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Remove deleted photos from local state
        setPhotos(prev => prev.filter(p => !selectedPhotos.has(p.id)))
        
        // Clear cover photo if it was deleted
        if (collection.coverPhoto && selectedPhotos.has(collection.coverPhoto.id)) {
          setCollection(prev => prev ? {
            ...prev,
            coverPhoto: undefined
          } : prev)
        }
        
        // Exit selection mode and clear selections
        setSelectionMode(false)
        setSelectedPhotos(new Set())
        
        console.log(`Successfully deleted ${data.deletedCount} photos`)
      }

    } catch (error) {
      console.error('Error bulk deleting photos:', error)
      alert(`Failed to delete photos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  const handleSetCover = async (photoId: string) => {
    if (!collection) {
      console.error('No collection available')
      return
    }

    try {
      console.log(`Starting cover photo update for collection: ${collection.slug}, photo: ${photoId}`)
      
      const token = localStorage.getItem('auth-token')
      if (!token) {
        console.error('No auth token found')
        throw new Error('No authentication token found')
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }

      const response = await fetch(`/api/collections/${collection.slug}/cover`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ photoId })
      })

      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        throw new Error(`Server returned invalid JSON. Status: ${response.status}`)
      }

      if (!response.ok) {
        console.error('API returned error:', data)
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      if (data.success && data.coverPhoto) {
        setCollection(prev => prev ? {
          ...prev,
          coverPhoto: data.coverPhoto
        } : prev)
        
        console.log('Cover photo updated successfully')
      }

    } catch (error) {
      console.error('Error updating cover photo:', error)
      alert(`Failed to set cover photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!collection) {
      console.error('No collection available')
      return
    }

    try {
      console.log(`Deleting photo: ${photoId} from collection: ${collection.slug}`)
      
      const token = localStorage.getItem('auth-token')
      if (!token) {
        console.error('No auth token found')
        throw new Error('No authentication token found')
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }

      const response = await fetch(`/api/collections/${collection.slug}/photos/${photoId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Remove photo from local state
        setPhotos(prev => prev.filter(p => p.id !== photoId))
        
        // If deleted photo was cover photo, clear cover photo
        if (collection.coverPhoto?.id === photoId) {
          setCollection(prev => prev ? {
            ...prev,
            coverPhoto: undefined
          } : prev)
        }
        
        console.log('Photo deleted successfully')
      }

    } catch (error) {
      console.error('Error deleting photo:', error)
      alert(`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeleteCollection = async () => {
    if (!collection) return

    if (!confirm(`Are you sure you want to delete "${collection.title}"? This action cannot be undone and will delete all photos in this collection.`)) {
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

      console.log('Collection deleted successfully')
      router.push('/collections?refresh=true')

    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Failed to delete collection. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading collection...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={fetchCollection}>Retry</Button>
            <Button variant="outline" onClick={() => router.push('/collections')}>
              Back to Collections
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Collection Not Found</h2>
          <p className="text-muted-foreground mb-4">The collection you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/collections')}>
            Back to Collections
          </Button>
        </div>
      </div>
    )
  }

  const design = getDesignSettings()
  const allSelected = photos.length > 0 && selectedPhotos.size === photos.length

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <Link href="/collections">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 
                    className="text-2xl font-semibold text-foreground"
                    style={{ 
                      fontFamily: design.typography.titleFont,
                      color: design.colors.accent 
                    }}
                  >
                    {collection.title}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    ACTIVE
                  </span>
                  {collection.isStarred && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {collection.description} • {new Date(collection.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href={`/collections/${collection.slug}/design`}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Design
                </Button>
              </Link>
              <Link href={`/collections/${collection.slug}/preview`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </Link>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Mode Banner */}
        {selectionMode && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {selectedPhotos.size} of {photos.length} selected
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={allSelected ? deselectAllPhotos : selectAllPhotos}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedPhotos.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteLoading}
                    className="gap-2"
                  >
                    {bulkDeleteLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Selected ({selectedPhotos.size})
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Compact Collection Header with Side Cover */}
        <div 
          className="border-b border-border p-6"
          style={{ backgroundColor: design.colors.background }}
        >
          <div className="flex gap-6 items-start">
            {/* Cover Photo - Left Side */}
            <div className="flex-shrink-0">
              <div 
                className="relative w-64 h-40 rounded-lg overflow-hidden group cursor-pointer border-2 transition-all duration-300 hover:shadow-lg"
                style={{ borderColor: design.colors.accent + '20' }}
                onClick={() => setShowCoverSelector(true)}
              >
                {collection.coverPhoto ? (
                  <>
                    <img
                      src={collection.coverPhoto.webUrl}
                      alt={`${collection.title} cover`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      style={{
                        objectPosition: `${design.coverFocus.x}% ${design.coverFocus.y}%`
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    
                    {/* Cover indicator */}
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-white/90 text-gray-700 shadow-sm"
                      >
                        Cover
                      </Badge>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 bg-white/90 text-black hover:bg-white shadow-lg"
                      >
                        <Camera className="h-4 w-4" />
                        Change
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors">
                    <div className="text-center text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">No Cover</p>
                      <p className="text-xs">Click to set</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cover photo info */}
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Cover Photo Preview
                </p>
              </div>
            </div>

            {/* Collection Info - Right Side */}
            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <h2 
                  className="text-2xl font-bold mb-2 truncate"
                  style={{ 
                    fontFamily: design.typography.titleFont,
                    color: design.colors.accent 
                  }}
                >
                  {collection.title}
                </h2>
                
                <div className="flex items-center gap-3 mb-3">
                  <Badge 
                    variant="outline" 
                    className="text-green-600 border-green-200 bg-green-50"
                  >
                    {photos.length} Photos
                  </Badge>
                  
                  {photos.filter(p => p.isRaw).length > 0 && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      {photos.filter(p => p.isRaw).length} RAW
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                    ACTIVE
                  </Badge>

                  {collection.isStarred && (
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  )}
                </div>

                {collection.description && (
                  <p 
                    className="text-muted-foreground mb-3 line-clamp-2"
                    style={{ fontFamily: design.typography.titleFont }}
                  >
                    {collection.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="h-4 w-4" />
                  <span>Created {new Date(collection.createdAt).toLocaleDateString()}</span>
                  {collection.updatedAt !== collection.createdAt && (
                    <>
                      <span>•</span>
                      <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Link href={`/upload?collection=${collection.id}`}>
                  <Button variant="default" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Photos
                  </Button>
                </Link>

                {photos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <CheckSquare className="h-4 w-4" />
                    )}
                    {selectionMode ? 'Cancel Select' : 'Select Photos'}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowCoverSelector(true)}
                >
                  <Camera className="h-4 w-4" />
                  Change Cover
                </Button>

                {photos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Bulk download logic here
                      alert('Bulk download coming soon!')
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download All
                  </Button>
                )}

                
              </div>
            </div>
          </div>
        </div>

        {/* Photo Content */}
        <div 
          className="flex-1 overflow-auto p-6"
          style={{ backgroundColor: design.colors.background }}
        >
          {photos.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No photos yet</h3>
                <p className="text-muted-foreground mb-4">
                  This collection is empty. Upload some photos to get started.
                </p>
                <Link href={`/upload?collection=${collection.id}`}>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Photos
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h3 
                    className="text-lg font-medium"
                    style={{ 
                      fontFamily: design.typography.titleFont,
                      color: design.colors.accent 
                    }}
                  >
                    Photos ({photos.length})
                  </h3>
                  <Badge variant="secondary" className="ml-2">
                    {photos.filter(p => p.isRaw).length} RAW
                  </Badge>
                </div>
              </div>

              {/* Photo Grid with Design Settings Applied */}
              <div 
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${design.grid.columns}, 1fr)`,
                  gap: `${design.grid.spacing}px`
                }}
              >
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer rounded-lg overflow-hidden bg-muted aspect-square hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    {/* Selection checkbox */}
                    {selectionMode && (
                      <div className="absolute top-2 left-2 z-20">
                        <div 
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                            selectedPhotos.has(photo.id)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white/90 border-white/60 text-gray-600'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePhotoSelection(photo.id)
                          }}
                        >
                          {selectedPhotos.has(photo.id) && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.filename}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

                    {/* Top Actions Row (only show when not in selection mode) */}
                    {!selectionMode && (
                      <div className="absolute top-2 left-2 right-2 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {/* Cover Photo Star */}
                        <Button
                          size="sm"
                          variant={collection.coverPhoto?.id === photo.id ? "default" : "outline"}
                          className={`h-8 w-8 p-0 shadow-lg ${
                            collection.coverPhoto?.id === photo.id
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : 'bg-white/90 hover:bg-white text-gray-700'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetCover(photo.id)
                          }}
                        >
                          <Star className={`h-4 w-4 ${
                            collection.coverPhoto?.id === photo.id ? 'fill-current' : ''
                          }`} />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0 shadow-lg bg-red-500 hover:bg-red-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Are you sure you want to delete "${photo.originalFilename}"? This action cannot be undone.`)) {
                              handleDeletePhoto(photo.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Photo Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div 
                        className="text-white text-xs font-medium truncate"
                        style={{ fontFamily: design.typography.titleFont }}
                      >
                        {photo.originalFilename}
                      </div>
                    </div>

                    {/* Selection overlay */}
                    {selectionMode && selectedPhotos.has(photo.id) && (
                      <div className="absolute inset-0 bg-blue-600/20 border-2 border-blue-600 rounded-lg" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <ShareCollectionDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        collection={{
          id: collection.id,
          title: collection.title,
          slug: collection.slug,
          photoCount: collection._count.photos,
        }}
      />

      {/* Photo Gallery */}
      {showGallery && selectedPhoto && (
        <PhotoGallery
          photos={photos}
          currentIndex={currentPhotoIndex}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onNavigate={(index) => {
            setCurrentPhotoIndex(index)
            setSelectedPhoto(photos[index])
          }}
          onDownload={async (photo) => {
            try {
              const response = await fetch(photo.originalUrl)
              const blob = await response.blob()
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = photo.originalFilename
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(link.href)
            } catch (error) {
              console.error('Download failed:', error)
              alert('Failed to download photo')
            }
          }}
          onFavorite={(photo) => {
            console.log('Favorite photo:', photo.id)
            alert('Favorites feature coming soon!')
          }}
          onShare={(photo) => {
            if (navigator.share) {
              navigator.share({
                title: `Photo: ${photo.originalFilename}`,
                url: window.location.href
              }).catch(console.error)
            } else {
              navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Link copied to clipboard!')
              })
            }
          }}
          onProcessRaw={(photo) => {
            setSelectedPhoto(photo)
            setShowRawProcessor(true)
            setShowGallery(false)
          }}
        />
      )}

      {/* Cover Photo Selector */}
      <CoverPhotoSelector
        open={showCoverSelector}
        onOpenChange={setShowCoverSelector}
        photos={photos}
        currentCoverPhotoId={collection.coverPhoto?.id}
        onSelectCover={handleSetCover}
      />
    </AppLayout>
  )
}