"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Download,
  Heart,
  Share2,
  Camera,
  ExternalLink,
  Download as DownloadIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
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

interface Share {
  shareToken: string
  collection: Collection
  photos: Photo[]
  isExpired: boolean
  requiresPassword: boolean
}

export default function PublicGalleryPage() {
  const params = useParams()
  const token = params.token as string
  const [shareData, setShareData] = useState<Share | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [password, setPassword] = useState('')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  
  // Lightbox controls
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  
  // Favorites system state
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavorites, setShowFavorites] = useState(false)
  const [downloadingFavorites, setDownloadingFavorites] = useState(false)

const fetchGallery =  useCallback(async () => { 
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/gallery/${token}`)

      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json()
          if (data.requiresPassword) {
            setShowPasswordDialog(true)
            return
          }
        }
        throw new Error('Gallery not found or access denied')
      }

      const data = await response.json()
      setShareData(data)

    } catch (error) {
      console.error('Error fetching gallery:', error)
      setError(error instanceof Error ? error.message : 'Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }, [token, setLoading, setError, setShowPasswordDialog, setShareData]);

const loadFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem(`favorites_${token}`)
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [token, setFavorites]);

const navigatePhoto = useCallback((direction: number) => {
    if (!shareData) return
    const newIndex = (currentPhotoIndex + direction + shareData.photos.length) % shareData.photos.length
    setCurrentPhotoIndex(newIndex)
    setSelectedPhoto(shareData.photos[newIndex])
    setZoom(1)
    setRotation(0)
  }, [currentPhotoIndex, shareData])

  useEffect(() => {
    if (params.token) {
      fetchGallery()
      loadFavorites()
    }
  }, [params.token, fetchGallery, loadFavorites])



  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!selectedPhoto || !shareData) return

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
  }, [selectedPhoto, shareData, navigatePhoto])

  

  const handleCloseLightbox = () => {
    setSelectedPhoto(null)
    setZoom(1)
    setRotation(0)
  }

  // Load favorites from localStorage
  

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem(`favorites_${params.token}`, JSON.stringify(Array.from(newFavorites)))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }

  

  const handlePasswordSubmit = async () => {
    try {
      const response = await fetch(`/api/gallery/${params.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      })

      if (!response.ok) {
        throw new Error('Incorrect password')
      }

      const data = await response.json()
      setShareData(data)
      setShowPasswordDialog(false)

    } catch (error) {
      console.error('Password verification failed:', error)
      alert('Incorrect password. Please try again.')
    }
  }

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhoto(photo)
    setCurrentPhotoIndex(index)
  }

  const handleDownload = async (photo: Photo) => {
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
  }

  // Toggle favorite status (with Prisma backend tracking)
  const toggleFavorite = async (photoId: string) => {
    const isCurrentlyFavorite = favorites.has(photoId)
    const action = isCurrentlyFavorite ? 'remove' : 'add'
    
    // Optimistic update
    const newFavorites = new Set(favorites)
    if (isCurrentlyFavorite) {
      newFavorites.delete(photoId)
    } else {
      newFavorites.add(photoId)
    }
    setFavorites(newFavorites)
    saveFavorites(newFavorites)

    // Send to Prisma backend for database tracking
    try {
      const response = await fetch(`/api/gallery/${params.token}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photoId,
          action
        })
      })

      if (!response.ok) {
        console.error('Backend favorite sync failed:', await response.text())
      }
    } catch (error) {
      console.error('Failed to sync favorite to backend:', error)
    }
  }

  // Download all favorites
  const handleDownloadFavorites = async () => {
    if (!shareData || favorites.size === 0) return

    setDownloadingFavorites(true)
    const favoritePhotos = shareData.photos.filter(photo => favorites.has(photo.id))

    try {
      for (let i = 0; i < favoritePhotos.length; i++) {
        const photo = favoritePhotos[i]
        await handleDownload(photo)
        
        // Small delay between downloads to prevent overwhelming the browser
        if (i < favoritePhotos.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    } catch (error) {
      console.error('Error downloading favorites:', error)
      alert('Some downloads may have failed. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

  // Clear all favorites
  const handleClearFavorites = () => {
    if (confirm('Clear all favorites? This cannot be undone.')) {
      setFavorites(new Set())
      saveFavorites(new Set())
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: shareData?.collection.title,
        text: `Check out this photo gallery: ${shareData?.collection.title}`,
        url: window.location.href
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Gallery link copied to clipboard!')
      }).catch(() => {
        alert('Unable to copy link. Please copy the URL manually.')
      })
    }
  }

  // Smooth scroll to gallery section
  const scrollToGallery = () => {
    const gallerySection = document.getElementById('gallery-section')
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Smooth scroll back to cover
  const scrollToCover = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gallery...</p>
        </div>
      </div>
    )
  }

  if (showPasswordDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold mb-4">Gallery Password Required</h2>
          <p className="text-gray-600 mb-6">This gallery is password protected. Please enter the password to continue.</p>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <Button onClick={handlePasswordSubmit} className="w-full">
              Access Gallery
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-500 mb-4">
            <ExternalLink className="h-16 w-16 mx-auto opacity-50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Gallery Not Available</h2>
          <p className="text-gray-600 mb-4">
            {error || 'This gallery link is invalid or has expired.'}
          </p>
        </div>
      </div>
    )
  }

  const { collection, photos } = shareData
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
    <div className="min-h-screen">
      {/* Cover Section - Full Screen Hero */}
      <section 
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
            className="absolute inset-0 flex items-center justify-center text-gray-500"
            style={{ backgroundColor: design.colors.background }}
          >
            <Camera className="h-24 w-24 opacity-20" />
          </div>
        )}

        {/* Cover Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>

        {/* Share Button */}
        <div className="absolute top-6 right-6 z-20">
          <Button
            onClick={handleShare}
            size="sm"
            variant="outline"
            className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Title and Content */}
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

          <div className="mb-12">
            <p className="text-white/80 text-sm tracking-wider">
              RENE RIVAROLA PHOTOGRAPHY
            </p>
          </div>

          {/* Scroll Down Button */}
          <Button
            onClick={scrollToGallery}
            size="lg"
            variant="ghost"
            className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 px-8 py-3 text-lg animate-bounce"
          >
            <ChevronDown className="h-6 w-6 mr-2" />
            View Photos
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/60">
          <div className="flex flex-col items-center">
            <p className="text-xs mb-2">SCROLL DOWN</p>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section 
        id="gallery-section"
        className="min-h-screen"
        style={{ backgroundColor: design.colors.background }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: design.typography.titleFont,
                    color: design.colors.accent
                  }}
                >
                  {collection.title.toUpperCase()}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  RENE RIVAROLA PHOTOGRAPHY
                </p>
              </div>

              <div className="flex items-center gap-3">
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
                <Button
                  variant="outline"
                  onClick={handleShare}
                  size="sm"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={scrollToCover}
                  size="sm"
                >
                  Back to Top
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Favorites Summary Panel */}
        {showFavorites && favorites.size > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="w-full px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">
                    {favorites.size} Photo{favorites.size !== 1 ? 's' : ''} Selected
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Your favorite photos are highlighted below
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownloadFavorites}
                    disabled={downloadingFavorites}
                    size="sm"
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    {downloadingFavorites ? 'Downloading...' : 'Download All'}
                  </Button>
                  <Button
                    onClick={handleClearFavorites}
                    variant="outline"
                    size="sm"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full-Width Photo Grid */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          {photos.length > 0 ? (
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${Math.max(200, 300)}px, 1fr))`,
                gap: `${design.grid.spacing}px`
              }}
            >
              {(showFavorites ? favoritePhotos : photos).map((photo, index) => {
                const isFavorite = favorites.has(photo.id)
                const actualIndex = showFavorites ? photos.findIndex(p => p.id === photo.id) : index
                return (
                  <div
                    key={photo.id}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group relative ${
                      isFavorite ? 'ring-2 ring-red-400 ring-opacity-60' : ''
                    }`}
                    onClick={() => handlePhotoClick(photo, actualIndex)}
                  >
                    <img
                      src={photo.webUrl}
                      alt={photo.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Favorite indicator */}
                    {isFavorite && (
                      <div className="absolute top-3 left-3">
                        <Heart className="h-5 w-5 fill-red-500 text-red-500 drop-shadow-lg" />
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`backdrop-blur border-white/30 text-white hover:bg-white/30 ${
                            isFavorite 
                              ? 'bg-red-500/80 hover:bg-red-500/60' 
                              : 'bg-white/20'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(photo.id)
                          }}
                        >
                          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(photo)
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-gray-500">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No photos in this collection</p>
              </div>
            </div>
          )}

          {showFavorites && favoritePhotos.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-500">
                <Heart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No favorites selected yet</p>
                <p className="text-sm mt-2">Click the heart icon on photos to add them to favorites</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 py-8 mt-16">
          <div className="w-full px-6 text-center">
            <p className="text-sm text-gray-600">
              © 2024 RENE RIVAROLA PHOTOGRAPHY
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced Photo Lightbox with Navigation */}
      {selectedPhoto && shareData && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col"
          onClick={handleCloseLightbox}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseLightbox}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="text-white">
                <h3 className="font-medium">{selectedPhoto.originalFilename}</h3>
                <p className="text-sm text-white/70">
                  {currentPhotoIndex + 1} of {shareData.photos.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom(prev => Math.max(prev / 1.2, 0.1))
                }}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom(prev => Math.min(prev * 1.2, 5))
                }}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setRotation(prev => (prev + 90) % 360)
                }}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setZoom(1)
                  setRotation(0)
                }}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>

              {/* Action Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(selectedPhoto.id)
                }}
                className={`text-white hover:text-white hover:bg-white/20 ${
                  favorites.has(selectedPhoto.id) ? 'bg-red-500/80' : ''
                }`}
              >
                <Heart className={`h-4 w-4 ${favorites.has(selectedPhoto.id) ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(selectedPhoto)
                }}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Image Area */}
          <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
            {/* Navigation Buttons */}
            {currentPhotoIndex > 0 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation()
                  navigatePhoto(-1)
                }}
                className="absolute left-4 z-10 text-white hover:text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {currentPhotoIndex < shareData.photos.length - 1 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation()
                  navigatePhoto(1)
                }}
                className="absolute right-4 z-10 text-white hover:text-white hover:bg-white/20"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
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

          {/* Keyboard Shortcuts Info */}
          <div className="absolute bottom-4 left-4 text-white/50 text-xs">
            <p>← → Navigate • +/- Zoom • R Rotate • ESC Close</p>
          </div>
        </div>
      )}
    </div>
  )
}