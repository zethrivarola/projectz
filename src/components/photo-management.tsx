"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Trash2,
  Star,
  StarOff,
  Move,
  AlertTriangle
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

interface PhotoManagementProps {
  photos: Photo[]
  collectionId: string
  collectionSlug: string
  currentCoverPhotoId?: string
  onPhotosUpdate: (photos: Photo[]) => void
  onSetCover: (photoId: string) => void
}

export function PhotoManagement({
  photos,
  collectionId,
  collectionSlug,
  currentCoverPhotoId,
  onPhotosUpdate,
  onSetCover
}: PhotoManagementProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId)
    } else {
      newSelected.add(photoId)
    }
    setSelectedPhotos(newSelected)
  }

  const handleDeleteSingle = (photoId: string) => {
    setDeletingPhotoId(photoId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteMultiple = () => {
    if (selectedPhotos.size === 0) return
    setDeletingPhotoId(null)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    setIsDeleting(true)

    try {
      const photosToDelete = deletingPhotoId ? [deletingPhotoId] : Array.from(selectedPhotos)

      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Delete each photo
      for (const photoId of photosToDelete) {
        const response = await fetch(`/api/photos/${photoId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete photo')
        }
      }

      // Update the photos list
      const updatedPhotos = photos.filter(p => !photosToDelete.includes(p.id))
      onPhotosUpdate(updatedPhotos)

      // Clear selection
      setSelectedPhotos(new Set())

      console.log(`✅ Successfully deleted ${photosToDelete.length} photo(s)`)

    } catch (error) {
      console.error('❌ Error deleting photos:', error)
      alert(`Failed to delete photos: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setDeletingPhotoId(null)
    }
  }

  const handleSetCover = async (photoId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`/api/collections/${collectionSlug}/cover`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to set cover photo')
      }

      onSetCover(photoId)
      console.log(`✅ Cover photo set successfully`)

    } catch (error) {
      console.error('❌ Error setting cover photo:', error)
      alert(`Failed to set cover photo: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const selectAll = () => {
    setSelectedPhotos(new Set(photos.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedPhotos(new Set())
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No photos in this collection yet.</p>
        <p className="text-sm mt-2">Upload some photos to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Management Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">
            {selectedPhotos.size} of {photos.length} photos selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={selectedPhotos.size === photos.length}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={selectedPhotos.size === 0}
          >
            Clear
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteMultiple}
            disabled={selectedPhotos.size === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedPhotos.size})
          </Button>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {photos.map((photo) => (
          <Card
            key={photo.id}
            className={`relative group cursor-pointer transition-all ${
              selectedPhotos.has(photo.id)
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:shadow-md'
            }`}
            onClick={() => handleSelectPhoto(photo.id)}
          >
            <CardContent className="p-2">
              <div className="relative aspect-square">
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.originalFilename}
                  className="w-full h-full object-cover rounded"
                />

                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded border-2 ${
                    selectedPhotos.has(photo.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'bg-white border-gray-300'
                  } flex items-center justify-center`}>
                    {selectedPhotos.has(photo.id) && (
                      <div className="w-2 h-2 bg-white rounded-sm" />
                    )}
                  </div>
                </div>

                {/* Cover Photo Badge */}
                {currentCoverPhotoId === photo.id && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Cover
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute bottom-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetCover(photo.id)
                    }}
                    className="w-6 h-6 p-0"
                    title={currentCoverPhotoId === photo.id ? "Remove as cover" : "Set as cover"}
                  >
                    {currentCoverPhotoId === photo.id ? (
                      <StarOff className="w-3 h-3" />
                    ) : (
                      <Star className="w-3 h-3" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSingle(photo.id)
                    }}
                    className="w-6 h-6 p-0"
                    title="Delete photo"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="mt-2">
                <p className="text-xs text-gray-600 truncate">
                  {photo.originalFilename}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Confirm Deletion</span>
            </DialogTitle>
            <DialogDescription>
              {deletingPhotoId ? (
                <>Are you sure you want to delete this photo? This action cannot be undone.</>
              ) : (
                <>Are you sure you want to delete {selectedPhotos.size} selected photos? This action cannot be undone.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
