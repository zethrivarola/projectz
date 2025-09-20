// components/cover-photo-selector.tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Camera, X } from "lucide-react"

interface Photo {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  width?: number
  height?: number
  isRaw: boolean
  rawFormat?: string
}

interface CoverPhotoSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photos: Photo[]
  currentCoverPhotoId?: string
  onSelectCover: (photoId: string) => Promise<void>
}

export function CoverPhotoSelector({
  open,
  onOpenChange,
  photos,
  currentCoverPhotoId,
  onSelectCover
}: CoverPhotoSelectorProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(currentCoverPhotoId || null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleConfirm = async () => {
    if (!selectedPhotoId) return

    try {
      setIsUpdating(true)
      await onSelectCover(selectedPhotoId)
      onOpenChange(false)
    } catch (error) {
      console.error('Error setting cover photo:', error)
      // Error is handled in parent component
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setSelectedPhotoId(currentCoverPhotoId || null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Select Cover Photo
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Choose a photo to use as the cover for this collection
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {photos.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No photos available</h3>
                <p className="text-muted-foreground">
                  Upload some photos to this collection first
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground px-1">
                Choose a photo to use as the cover for this collection ({photos.length} photos available)
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden aspect-square transition-all ${
                        selectedPhotoId === photo.id
                          ? 'ring-2 ring-primary shadow-lg'
                          : 'hover:shadow-md hover:scale-[1.02]'
                      }`}
                      onClick={() => setSelectedPhotoId(photo.id)}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />

                      {/* Overlay */}
                      <div className={`absolute inset-0 transition-colors ${
                        selectedPhotoId === photo.id
                          ? 'bg-black/20'
                          : 'bg-black/0 group-hover:bg-black/10'
                      }`} />

                      {/* Current Cover Badge */}
                      {currentCoverPhotoId === photo.id && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Current Cover
                          </Badge>
                        </div>
                      )}

                      {/* RAW Badge */}
                      {photo.isRaw && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className="text-xs bg-white/90">
                            {photo.rawFormat}
                          </Badge>
                        </div>
                      )}

                      {/* Selection Indicator */}
                      {selectedPhotoId === photo.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-2">
                            <Check className="h-6 w-6" />
                          </div>
                        </div>
                      )}

                      {/* Photo Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="text-white text-xs font-medium truncate">
                          {photo.originalFilename}
                        </div>
                      </div>

                      {/* Hover State */}
                      <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                        selectedPhotoId === photo.id ? 'hidden' : ''
                      }`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/90 hover:bg-white text-black"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPhotoId(photo.id)
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t pt-4 flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  {selectedPhotoId 
                    ? `Selected: ${photos.find(p => p.id === selectedPhotoId)?.originalFilename}`
                    : 'No photo selected'
                  }
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!selectedPhotoId || isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Set as Cover'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}