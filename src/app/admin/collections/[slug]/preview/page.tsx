"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Download,
  Heart,
  Share2,
  Camera,
  Download as DownloadIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ArrowLeft,
  Check,
  Square
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

export default function PublicCollectionPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const getAuthHeaders = useCallback(() => {
  const token = localStorage.getItem('auth-token')
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}, [])
  
  const [collection, setCollection] = useState<Collection | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [showFavorites, setShowFavorites] = useState(false)
  const [downloadingFavorites, setDownloadingFavorites] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'web' | 'original'>('original')
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

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

      const response = await fetch(`/api/collections/${slug}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Collection not found')
        }
        if (response.status === 403) {
          throw new Error('This collection is private')
        }
        throw new Error('Failed to load collection')
      }

      const data = await response.json()
      setCollection(data.collection)
      setPhotos(data.photos || [])

    } catch (error) {
      console.error('Error fetching collection:', error)
      setError(error instanceof Error ? error.message : 'Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [slug, getAuthHeaders, router])

  const loadFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem(`favorites_${slug}`)
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [slug])

  const navigatePhoto = useCallback((direction: number) => {
    if (photos.length === 0) return
    const newIndex = (currentPhotoIndex + direction + photos.length) % photos.length
    setCurrentPhotoIndex(newIndex)
    setSelectedPhoto(photos[newIndex])
    setZoom(1)
    setRotation(0)
  }, [currentPhotoIndex, photos])

  useEffect(() => {
    fetchCollection()
    loadFavorites()
  }, [fetchCollection, loadFavorites])

  useEffect(() => {
    if (!selectedPhoto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleCloseLightbox()
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigatePhoto(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          navigatePhoto(1)
          break
        case ' ':
          e.preventDefault()
          navigatePhoto(1)
          break
        case '=':
        case '+':
          e.preventDefault()
          setZoom(prev => Math.min(prev * 1.2, 5))
          break
        case '-':
          e.preventDefault()
          setZoom(prev => Math.max(prev / 1.2, 0.1))
          break
        case 'r':
        case 'R':
          e.preventDefault()
          setRotation(prev => (prev + 90) % 360)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhoto, navigatePhoto])

  const handleCloseLightbox = () => {
    setSelectedPhoto(null)
    setZoom(1)
    setRotation(0)
  }

  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem(`favorites_${slug}`, JSON.stringify(Array.from(newFavorites)))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhoto(photo)
    setCurrentPhotoIndex(index)
  }

  const handleDownload = async (photo: Photo, format: 'web' | 'original' = 'original') => {
    try {
      const url = format === 'original' ? photo.originalUrl : photo.webUrl
      const response = await fetch(url)
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
  }

  const toggleFavorite = (photoId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId)
    } else {
      newFavorites.add(photoId)
    }
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  const toggleSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos)
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId)
    } else {
      newSelection.add(photoId)
    }
    setSelectedPhotos(newSelection)
  }

  const selectAll = () => {
    setSelectedPhotos(new Set(photos.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedPhotos(new Set())
  }

  const handleClearFavorites = () => {
    if (confirm('Clear all favorites? This cannot be undone.')) {
      setFavorites(new Set())
      saveFavorites(new Set())
    }
  }

  const handleDownloadAsZip = async (photoIds?: string[]) => {
    setDownloadingFavorites(true)
    
    try {
      const photoCount = photoIds ? photoIds.length : photos.length
      console.log(`📦 Starting ZIP download: ${photoCount} photos in ${downloadFormat} format`)

      const response = await fetch(`/api/collections/${slug}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: downloadFormat,
          photoIds: photoIds
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate ZIP')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${collection?.slug}-${downloadFormat}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log('✅ ZIP download completed')

    } catch (error) {
      console.error('❌ ZIP download error:', error)
      alert(error instanceof Error ? error.message : 'Failed to download ZIP. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

  const handleDownloadFavorites = async () => {
    if (favorites.size === 0) return

    setDownloadingFavorites(true)
    const favoritePhotos = photos.filter(photo => favorites.has(photo.id))

    try {
      if (favoritePhotos.length >= 10) {
        await handleDownloadAsZip(Array.from(favorites))
      } else {
        for (let i = 0; i < favoritePhotos.length; i++) {
          const photo = favoritePhotos[i]
          await handleDownload(photo, downloadFormat)
          
          if (i < favoritePhotos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }
    } catch (error) {
      console.error('Error downloading favorites:', error)
      alert('Some downloads may have failed. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

  const handleDownloadSelected = async () => {
    if (selectedPhotos.size === 0) return

    setDownloadingFavorites(true)
    const selectedPhotosList = photos.filter(photo => selectedPhotos.has(photo.id))

    try {
      if (selectedPhotosList.length >= 10) {
        await handleDownloadAsZip(Array.from(selectedPhotos))
      } else {
        for (let i = 0; i < selectedPhotosList.length; i++) {
          const photo = selectedPhotosList[i]
          await handleDownload(photo, downloadFormat)
          
          if (i < selectedPhotosList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }
      clearSelection()
    } catch (error) {
      console.error('Error downloading selected:', error)
      alert('Some downloads may have failed. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

  const handleDownloadAll = async () => {
    if (photos.length === 0) return
    
    const message = downloadFormat === 'original' 
      ? `Download all ${photos.length} photos in original quality as ZIP? This may take a while.`
      : `Download all ${photos.length} photos in 1080p quality as ZIP? This will be faster.`
    
    if (!confirm(message)) {
      return
    }

    await handleDownloadAsZip()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: collection?.title,
        text: `Check out this photo collection: ${collection?.title}`,
        url: window.location.href
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Collection link copied to clipboard!')
      }).catch(() => {
        alert('Unable to copy link. Please copy the URL manually.')
      })
    }
  }

  const scrollToGallery = () => {
    const gallerySection = document.getElementById('gallery-section')
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToCover = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading collection...</p>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-500 mb-4">
            <Camera className="h-16 w-16 mx-auto opacity-50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Collection Not Available</h2>
          <p className="text-gray-600 mb-4">
            {error || 'This collection could not be loaded.'}
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collections
            </Button>
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

  const favoritePhotos = photos.filter(photo => favorites.has(photo.id))

  return (
    <div>
      <section 
  className="flex items-center justify-center relative overflow-hidden"
  style={{ 
  backgroundColor: collection.design?.colors?.background || '#ffffff',
  height: '100dvh',
  width: '100dvw'
}}
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
    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
      <Camera className="h-24 w-24 opacity-20" />
    </div>
  )}

  <div className="absolute inset-0 bg-black/40"></div>

  <div className="absolute top-6 left-6 z-20">
    <Link href={`/admin/collections/${slug}`}>
      <Button size="sm" variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Admin
      </Button>
    </Link>
  </div>

  <div className="absolute top-6 right-6 z-20">
    <Button onClick={handleShare} size="sm" variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30">
      <Share2 className="h-4 w-4 mr-2" />
      Share
    </Button>
  </div>

  <div className="relative z-10 text-center">
    <h1
  className="font-bold tracking-wide mb-8"
  style={{
    fontFamily: design.typography.titleFont,
    fontSize: `clamp(20px, 4vw, ${design.typography.titleSize}px)`,
    color: design.typography.titleColor
  }}
>
      {collection.title.toUpperCase()}
    </h1>

    <div className="mb-12">
      <p className="text-white/80 text-sm tracking-wider">
        RENE RIVAROLA PHOTOGRAPHY
      </p>
    </div>

    <Button
      onClick={scrollToGallery}
      size="lg"
      variant="ghost"
      className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 px-4 py-2 text-xs sm:text-sm md:text-base lg:text-lg animate-bounce"
    >
      <ChevronDown className="h-6 w-6 mr-2" />
      View Photos
    </Button>
  </div>

  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60">
    <div className="flex flex-col items-center">
      <p className="text-xs mb-2">SCROLL DOWN</p>
      <ChevronDown className="h-4 w-4 animate-bounce" />
    </div>
  </div>
</section>
      <section id="gallery-section" className="min-h-screen" style={{ backgroundColor: design.colors.background }}>
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" style={{ fontFamily: design.typography.titleFont, color: design.colors.accent }}>
                  {collection.title.toUpperCase()}
                </h2>
                <p className="text-sm text-gray-600 mt-1">RENE RIVAROLA PHOTOGRAPHY</p>
              </div>

              <div className="flex items-center gap-3">
                {selectedPhotos.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      onClick={handleDownloadSelected}
                      size="sm"
                      disabled={downloadingFavorites}
                    >
                      <DownloadIcon className="h-4 w-4 mr-2" />
                      Download Selected ({selectedPhotos.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearSelection}
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                )}

                {favorites.size > 0 && (
                  <Button
                    variant={showFavorites ? "default" : "outline"}
                    onClick={() => setShowFavorites(!showFavorites)}
                    size="sm"
                  >
                    <Heart className={`h-4 w-4 mr-2 ${favorites.size > 0 ? 'fill-current' : ''}`} />
                    Favorites ({favorites.size})
                  </Button>
                )}
                
                <div className="relative">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Download
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                  
                  {showDownloadMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowDownloadMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                        <div className="p-4">
                          <div className="mb-4">
                            <p className="text-xs font-medium text-gray-700 mb-2">Download Quality</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setDownloadFormat('web')}
                                className={`px-3 py-2 text-sm rounded-md border transition-all ${
                                  downloadFormat === 'web'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <div className="font-medium">1080p</div>
                                <div className="text-xs opacity-75">Faster</div>
                              </button>
                              <button
                                onClick={() => setDownloadFormat('original')}
                                className={`px-3 py-2 text-sm rounded-md border transition-all ${
                                  downloadFormat === 'original'
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <div className="font-medium">Original</div>
                                <div className="text-xs opacity-75">Full Quality</div>
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-gray-100 my-3"></div>

                          <div className="space-y-1">
                            {selectedPhotos.size > 0 && (
                              <button
                                onClick={() => {
                                  setShowDownloadMenu(false)
                                  handleDownloadSelected()
                                }}
                                disabled={downloadingFavorites}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Download Selected</span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {selectedPhotos.size} {selectedPhotos.size >= 10 ? 'as ZIP' : 'photos'}
                                  </span>
                                </div>
                                {selectedPhotos.size >= 10 && (
                                  <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Will be packaged as ZIP file
                                  </p>
                                )}
                                {selectedPhotos.size < 10 && (
                                  <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Individual downloads
                                  </p>
                                )}
                              </button>
                            )}

                            {favorites.size > 0 && (
                              <button
                                onClick={() => {
                                  setShowDownloadMenu(false)
                                  handleDownloadFavorites()
                                }}
                                disabled={downloadingFavorites}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-red-500 fill-current" />
                                    <span className="font-medium">Download Favorites</span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {favorites.size} {favorites.size >= 10 ? 'as ZIP' : 'photos'}
                                  </span>
                                </div>
                                {favorites.size >= 10 && (
                                  <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Will be packaged as ZIP file
                                  </p>
                                )}
                                {favorites.size < 10 && (
                                  <p className="text-xs text-gray-500 mt-1 ml-6">
                                    Individual downloads
                                  </p>
                                )}
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setShowDownloadMenu(false)
                                handleDownloadAll()
                              }}
                              disabled={downloadingFavorites}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DownloadIcon className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">Download All</span>
                                </div>
                                <span className="text-xs text-gray-500">{photos.length} photos</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 ml-6">
                                Complete collection as ZIP
                              </p>
                            </button>
                          </div>

                          {downloadingFavorites && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span>Preparing download...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Button variant="outline" onClick={handleShare} size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" onClick={scrollToCover} size="sm">
                  Back to Top
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showFavorites && favorites.size > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="w-full px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">{favorites.size} Favorite Photo{favorites.size !== 1 ? 's' : ''}</h3>
                  <p className="text-sm text-yellow-700">These are your favorite photos from this collection</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadFavorites} disabled={downloadingFavorites} size="sm">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    {downloadingFavorites ? 'Downloading...' : 'Download Favorites'}
                  </Button>
                  <Button onClick={handleClearFavorites} variant="outline" size="sm">Clear Favorites</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedPhotos.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-200">
            <div className="w-full px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-800">{selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''} Selected for Download</h3>
                  <p className="text-sm text-blue-700">Ready to download your selection</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={selectAll} variant="outline" size="sm">
                    Select All ({photos.length})
                  </Button>
                  <Button onClick={clearSelection} variant="outline" size="sm">
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {photos.length > 0 ? (
            <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${design.grid.columns}, minmax(200px, 1fr))`, gap: `${design.grid.spacing}px` }}>
              {(showFavorites ? favoritePhotos : photos).map((photo, index) => {
                const isFavorite = favorites.has(photo.id)
                const isSelected = selectedPhotos.has(photo.id)
                const actualIndex = showFavorites ? photos.findIndex(p => p.id === photo.id) : index
                return (
                  <div
                    key={photo.id}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group relative ${
                      isSelected ? 'ring-4 ring-blue-500' : isFavorite ? 'ring-2 ring-red-400 ring-opacity-60' : ''
                    }`}
                    onClick={() => handlePhotoClick(photo, actualIndex)}
                  >
                    <img src={photo.webUrl} alt={photo.originalFilename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    
                    {/* Selection Checkbox - Top Right (always visible when selected) */}
                    <div 
                      className={`absolute top-3 right-3 z-10 transition-opacity duration-200 ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleSelection(photo.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all shadow-lg ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white/90 border-white backdrop-blur hover:bg-white hover:scale-110'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    </div>

                    {/* Favorite Heart - Top Left (always visible when favorited) */}
                    {isFavorite && (
                      <div className="absolute top-3 left-3 z-10">
                        <Heart className="h-5 w-5 fill-red-500 text-red-500 drop-shadow-lg" />
                      </div>
                    )}

                    {/* Action Buttons - Bottom Right (only on hover) */}
                    <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 w-8 p-0 backdrop-blur-md border-white/40 shadow-lg transition-all hover:scale-110 ${
                          isFavorite 
                            ? 'bg-red-500/90 text-white hover:bg-red-600/90 border-red-400' 
                            : 'bg-white/90 text-gray-700 hover:bg-white'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(photo.id)
                        }}
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 bg-white/90 backdrop-blur-md border-white/40 text-gray-700 hover:bg-white shadow-lg transition-all hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(photo, downloadFormat)
                        }}
                        title="Download this photo"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Overlay gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-500" />
              <p className="text-lg text-gray-500">No photos in this collection</p>
            </div>
          )}

          {showFavorites && favoritePhotos.length === 0 && (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-500" />
              <p className="text-lg text-gray-500">No favorites selected yet</p>
              <p className="text-sm mt-2 text-gray-400">Click the heart icon on photos to add them to favorites</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 py-8 mt-16">
          <div className="w-full px-6 text-center">
            <p className="text-sm text-gray-600">© {new Date().getFullYear()} RENE RIVAROLA PHOTOGRAPHY</p>
          </div>
        </div>
      </section>

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={handleCloseLightbox}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleCloseLightbox} className="text-white hover:text-white hover:bg-white/20">
                <X className="h-4 w-4" />
              </Button>
              <div className="text-white">
                <h3 className="font-medium">{selectedPhoto.originalFilename}</h3>
                <p className="text-sm text-white/70">{currentPhotoIndex + 1} of {photos.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(prev / 1.2, 0.1)); }} className="text-white hover:text-white hover:bg-white/20">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(prev * 1.2, 5)); }} className="text-white hover:text-white hover:bg-white/20">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setRotation(prev => (prev + 90) % 360); }} className="text-white hover:text-white hover:bg-white/20">
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setZoom(1); setRotation(0); }} className="text-white hover:text-white hover:bg-white/20">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleFavorite(selectedPhoto.id); }} className={`text-white hover:text-white hover:bg-white/20 ${favorites.has(selectedPhoto.id) ? 'bg-red-500/80' : ''}`}>
                <Heart className={`h-4 w-4 ${favorites.has(selectedPhoto.id) ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); toggleSelection(selectedPhoto.id); }} className={`text-white hover:text-white hover:bg-white/20 ${selectedPhotos.has(selectedPhoto.id) ? 'bg-blue-500/80' : ''}`}>
                {selectedPhotos.has(selectedPhoto.id) ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownload(selectedPhoto, downloadFormat); }} className="text-white hover:text-white hover:bg-white/20">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Image Area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden" style={{ minHeight: 0 }} onClick={(e) => e.stopPropagation()}>
            {/* Navigation Buttons */}
            {currentPhotoIndex > 0 && (
              <Button variant="ghost" size="lg" onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }} className="absolute left-4 z-10 text-white hover:text-white hover:bg-white/20">
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {currentPhotoIndex < photos.length - 1 && (
              <Button variant="ghost" size="lg" onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }} className="absolute right-4 z-10 text-white hover:text-white hover:bg-white/20">
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            <div className="w-full h-full flex items-center justify-center p-4">
              <img 
                src={selectedPhoto.webUrl} 
                alt={selectedPhoto.originalFilename} 
                className="max-w-full max-h-full object-contain transition-transform duration-200" 
                style={{ 
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }} 
              />
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="shrink-0 bg-black/80 backdrop-blur-sm border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 p-4 min-w-max">
                {photos.map((photo, index) => {
                  const isActive = photo.id === selectedPhoto.id
                  const isFav = favorites.has(photo.id)
                  const isSel = selectedPhotos.has(photo.id)
                  return (
                    <button
                      key={photo.id}
                      onClick={() => handlePhotoClick(photo, index)}
                      className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                        isActive 
                          ? 'ring-2 ring-white scale-110' 
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalFilename}
                        className="w-full h-full object-cover"
                      />
                      {/* Badges */}
                      <div className="absolute top-1 left-1 flex gap-1">
                        {isFav && (
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <Heart className="h-2.5 w-2.5 fill-white text-white" />
                          </div>
                        )}
                        {isSel && (
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="absolute bottom-32 left-4 text-white/50 text-xs pointer-events-none">
            <p>← → Navigate • +/- Zoom • R Rotate • ESC Close</p>
          </div>
        </div>
      )}
    </div>
  )
}