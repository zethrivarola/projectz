"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type MetadataType = {
  camera?: string
  lens?: string
  iso?: number
  focalLength?: string | number
  aperture?: string
  shutterSpeed?: string
  dateTime?: string
  dimensions?: string 
  // Agrega otros campos que uses en tu metadata
}
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  Share2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  MoreVertical,
  Camera,
  Clock,
  FileText,
  Settings,
  Eye,
  Maximize2
} from "lucide-react"

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

interface PhotoGalleryProps {
  photos: Photo[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onDownload?: (photo: Photo) => void
  onFavorite?: (photo: Photo) => void
  onShare?: (photo: Photo) => void
  onProcessRaw?: (photo: Photo) => void
}

export function PhotoGallery({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onDownload,
  onFavorite,
  onShare,
  onProcessRaw
}: PhotoGalleryProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [showMetadata, setShowMetadata] = useState(false)

  const currentPhoto = photos[currentIndex]

const navigateToNext = useCallback((direction: number) => {
    const newIndex = (currentIndex + direction + photos.length) % photos.length
    onNavigate(newIndex)
    setZoom(1)
    setRotation(0)
  }, [currentIndex, photos.length, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigateToNext(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateToNext(1)
          break
        case ' ':
          e.preventDefault()
          navigateToNext(1)
          break
        case 'm':
        case 'M':
          e.preventDefault()
          setShowMetadata(!showMetadata)
          break
        case 'r':
        case 'R':
          e.preventDefault()
          setRotation(prev => (prev + 90) % 360)
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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showMetadata, onClose, navigateToNext])

  

  const resetView = () => {
    setZoom(1)
    setRotation(0)
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen || !currentPhoto) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-white">
            <h3 className="font-medium">{currentPhoto.filename}</h3>
            <p className="text-sm text-white/70">
              {currentIndex + 1} of {photos.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMetadata(!showMetadata)}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.max(prev / 1.2, 0.1))}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.min(prev * 1.2, 5))}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetView}
            className="text-white hover:text-white hover:bg-white/20"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Action Buttons */}
          {currentPhoto.isRaw && onProcessRaw && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onProcessRaw(currentPhoto)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          {onFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFavorite(currentPhoto)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(currentPhoto)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(currentPhoto)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Image Area */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigateToNext(-1)}
              className="absolute left-4 z-10 text-white hover:text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          {currentIndex < photos.length - 1 && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigateToNext(1)}
              className="absolute right-4 z-10 text-white hover:text-white hover:bg-white/20"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div className="relative max-w-full max-h-full">
            <img
              src={currentPhoto.webUrl}
              alt={currentPhoto.filename}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            />

            {/* File Type Badge */}
            {currentPhoto.isRaw && (
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="text-xs">
                  {currentPhoto.rawFormat}
                  {currentPhoto.processingStatus === 'pending' && (
                    <span className="ml-1 text-amber-600">• Unprocessed</span>
                  )}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Sidebar */}
        {showMetadata && (
          <div className="w-80 bg-black/90 backdrop-blur-sm border-l border-white/10 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Photo Details
              </h4>

              <Tabs defaultValue="info" className="text-white">
                <TabsList className="grid w-full grid-cols-2 bg-white/10">
                  <TabsTrigger value="info" className="text-white data-[state=active]:text-black">Info</TabsTrigger>
                  <TabsTrigger value="exif" className="text-white data-[state=active]:text-black">EXIF</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="text-sm text-white/70">Filename</p>
                        <p className="text-sm text-white">{currentPhoto.originalFilename}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/70">Created</p>
                        <p className="text-sm text-white">{formatDate(currentPhoto.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-white/70">Type</p>
                        <p className="text-sm text-white">
                          {currentPhoto.isRaw ? `RAW (${currentPhoto.rawFormat})` : 'Standard Image'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-white/70">Aspect Ratio</p>
                        <p className="text-sm text-white capitalize">{currentPhoto.aspectRatio}</p>
                      </div>
                      {(() => {
                        const fileSize = currentPhoto.metadata?.fileSize
                        return fileSize && typeof fileSize === 'string' ? (
                          <div>
                            <p className="text-sm text-white/70">File Size</p>
                            <p className="text-sm text-white">{fileSize}</p>
                          </div>
                        ) : null
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="exif" className="space-y-4 mt-4">
                  {currentPhoto.metadata ? (
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-4 space-y-3">
                        {currentPhoto.metadata && 
 (currentPhoto.metadata as MetadataType).camera && 
 typeof (currentPhoto.metadata as MetadataType).camera === 'string' && (
                          <div>
                            <p className="text-sm text-white/70">Camera</p>
                            <p className="text-sm text-white">{String((currentPhoto.metadata as MetadataType).camera)}</p>
                          </div>
                        )}
                        {currentPhoto.metadata && 
 (currentPhoto.metadata as MetadataType).lens && 
 typeof (currentPhoto.metadata as MetadataType).lens === 'string' && (
                          <div>
                            <p className="text-sm text-white/70">Lens</p>
                            <p className="text-sm text-white">{String((currentPhoto.metadata as MetadataType).lens)}</p>
                          </div>
                        )}
                        {currentPhoto.metadata && 
 (currentPhoto.metadata as MetadataType).focalLength && 
 typeof (currentPhoto.metadata as MetadataType).focalLength !== 'undefined' && (
                          <div>
                            <p className="text-sm text-white/70">Focal Length</p>
                            <p className="text-sm text-white">{String((currentPhoto.metadata as MetadataType).focalLength)}</p>
                          </div>
                        )}
                        {(currentPhoto.metadata as MetadataType).aperture && typeof (currentPhoto.metadata as MetadataType).aperture !== 'undefined' && (
                          <div>
                            <p className="text-sm text-white/70">Aperture</p>
                            <p className="text-sm text-white">f/{String((currentPhoto.metadata as MetadataType).aperture)}</p>
                          </div>
                        )}
                        {(currentPhoto.metadata as MetadataType).shutterSpeed && typeof (currentPhoto.metadata as MetadataType).shutterSpeed !== 'undefined' && (
                          <div>
                            <p className="text-sm text-white/70">Shutter Speed</p>
                            <p className="text-sm text-white">{String((currentPhoto.metadata as MetadataType).shutterSpeed)}s</p>
                          </div>
                        )}
                        {(currentPhoto.metadata as MetadataType).iso && typeof (currentPhoto.metadata as MetadataType).iso !== 'undefined' && (
                          <div>
                            <p className="text-sm text-white/70">ISO</p>
                            <p className="text-sm text-white">{String((currentPhoto.metadata as MetadataType).iso)}</p>
                          </div>
                        )}
                        {(currentPhoto.metadata as MetadataType).dimensions && typeof (currentPhoto.metadata as MetadataType).dimensions === 'string' && (
                          <div>
                            <p className="text-sm text-white/70">Dimensions</p>
                            <p className="text-sm text-white">{String((currentPhoto.metadata as MetadataType).dimensions)}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-4 text-center">
                        <Camera className="h-8 w-8 mx-auto mb-2 text-white/50" />
                        <p className="text-sm text-white/70">No EXIF data available</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* Photo Strip */}
      <div className="bg-black/80 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="flex gap-2 overflow-x-auto max-w-full">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => {
                onNavigate(index)
                resetView()
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-white'
                  : 'border-transparent hover:border-white/50'
              }`}
            >
              <img
                src={photo.thumbnailUrl}
                alt={photo.filename}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="absolute bottom-4 left-4 text-white/50 text-xs">
        <p>← → Navigate • M Metadata • R Rotate • +/- Zoom • ESC Close</p>
      </div>
    </div>
  )
}
