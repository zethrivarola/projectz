"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Heart,
  HeartHandshake,
  Download,
  Mail,
  Star,
  MessageCircle,
  Send
} from "lucide-react"

interface Photo {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
}

interface Favorite {
  id: string
  photoId: string
  clientEmail: string
  notes?: string
  createdAt: string
  photo: Photo
}

interface ClientFavoritesProps {
  accessToken: string
  onFavoriteToggle?: (photoId: string, isFavorited: boolean) => void
}

export function ClientFavorites({ accessToken, onFavoriteToggle }: ClientFavoritesProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [clientEmail, setClientEmail] = useState("")
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  const loadFavorites = useCallback(async () => {
    try {
      const response = await fetch(`/api/gallery/${accessToken}/favorites`)
      if (response.ok) {
        const data = await response.json()
        setFavorites(data.favorites || [])
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [accessToken, setFavorites]);

  const toggleFavorite = async (photo: Photo, email?: string) => {
    // If no email set, prompt for it first
    if (!email && !clientEmail) {
      setSelectedPhoto(photo)
      setShowEmailDialog(true)
      return
    }

    const emailToUse = email || clientEmail

    setIsLoading(true)
    try {
      const existingFavorite = favorites.find(f => f.photoId === photo.id && f.clientEmail === emailToUse)

      if (existingFavorite) {
        // Remove favorite
        const response = await fetch(`/api/gallery/${accessToken}/favorites/${existingFavorite.id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setFavorites(favorites.filter(f => f.id !== existingFavorite.id))
          onFavoriteToggle?.(photo.id, false)
        }
      } else {
        // Add favorite
        const response = await fetch(`/api/gallery/${accessToken}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoId: photo.id,
            clientEmail: emailToUse,
          }),
        })

        if (response.ok) {
          const newFavorite = await response.json()
          setFavorites([...favorites, newFavorite])
          onFavoriteToggle?.(photo.id, true)
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addNoteToFavorite = async () => {
    if (!selectedPhoto || !notes.trim()) return

    setIsLoading(true)
    try {
      const existingFavorite = favorites.find(f => f.photoId === selectedPhoto.id && f.clientEmail === clientEmail)

      if (existingFavorite) {
        // Update existing favorite with notes
        const response = await fetch(`/api/gallery/${accessToken}/favorites/${existingFavorite.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notes }),
        })

        if (response.ok) {
          const updatedFavorite = await response.json()
          setFavorites(favorites.map(f => f.id === existingFavorite.id ? updatedFavorite : f))
        }
      }

      setShowNotesDialog(false)
      setNotes("")
      setSelectedPhoto(null)
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadFavorites = async () => {
    if (!clientEmail || favorites.length === 0) return

    try {
      const response = await fetch(`/api/gallery/${accessToken}/favorites/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientEmail }),
      })

      if (response.ok) {
        const { downloadUrl } = await response.json()

        // Trigger download
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = 'favorites.zip'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error downloading favorites:', error)
    }
  }

  const sendFavoritesToPhotographer = async () => {
    if (!clientEmail || favorites.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/gallery/${accessToken}/favorites/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientEmail }),
      })

      if (response.ok) {
        alert('Your favorite photos have been sent to the photographer!')
      }
    } catch (error) {
      console.error('Error sending favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const isFavorited = (photoId: string): boolean => {
    return favorites.some(f => f.photoId === photoId && f.clientEmail === clientEmail)
  }

  const getFavoriteNotes = (photoId: string): string => {
    const favorite = favorites.find(f => f.photoId === photoId && f.clientEmail === clientEmail)
    return favorite?.notes || ""
  }

  return (
    <>
      {/* Email Collection Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Add to Favorites
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Enter your email to save favorite photos and receive notifications
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedPhoto && clientEmail) {
                  toggleFavorite(selectedPhoto, clientEmail)
                  setShowEmailDialog(false)
                }
              }}
              disabled={!clientEmail || isLoading}
            >
              Add to Favorites
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Add Note to Photo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedPhoto && (
              <div className="flex items-center gap-3">
                <img
                  src={selectedPhoto.thumbnailUrl}
                  alt={selectedPhoto.originalFilename}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <h4 className="font-medium text-sm">{selectedPhoto.originalFilename}</h4>
                  <p className="text-xs text-muted-foreground">Add your thoughts about this photo</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="What do you like about this photo? Any special requests?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={addNoteToFavorite}
              disabled={!notes.trim() || isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Favorites Summary (if client has email set) */}
      {clientEmail && favorites.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5" />
                Your Favorites ({favorites.filter(f => f.clientEmail === clientEmail).length})
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadFavorites}
                  disabled={isLoading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={sendFavoritesToPhotographer}
                  disabled={isLoading}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send to Photographer
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {favorites
                .filter(f => f.clientEmail === clientEmail)
                .slice(0, 8)
                .map((favorite) => (
                  <div key={favorite.id} className="aspect-square relative group">
                    <img
                      src={favorite.photo.thumbnailUrl}
                      alt={favorite.photo.originalFilename}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <div className="absolute top-1 right-1">
                        <Heart className="h-3 w-3 text-red-500 fill-current" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// Hook for photo favorite functionality
export function useFavorites(accessToken: string, clientEmail: string) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const toggleFavorite = async (photoId: string) => {
    if (!clientEmail) return false

    setIsLoading(true)
    try {
      const isFavorited = favorites.includes(photoId)

      if (isFavorited) {
        // Remove favorite
        const response = await fetch(`/api/gallery/${accessToken}/favorites/${photoId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clientEmail }),
        })

        if (response.ok) {
          setFavorites(favorites.filter(id => id !== photoId))
          return false
        }
      } else {
        // Add favorite
        const response = await fetch(`/api/gallery/${accessToken}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoId,
            clientEmail,
          }),
        })

        if (response.ok) {
          setFavorites([...favorites, photoId])
          return true
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setIsLoading(false)
    }

    return favorites.includes(photoId)
  }

  const isFavorited = (photoId: string): boolean => {
    return favorites.includes(photoId)
  }

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorited,
  }
}
