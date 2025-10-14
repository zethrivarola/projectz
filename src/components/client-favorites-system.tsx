"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Heart,
  Star,
  ThumbsUp,
  ThumbsDown,
  X,
  Check,
  Clock,
  Download,
  Share2,
  Eye,
  MessageSquare,
  Send,
  Filter,
  Grid3x3,
  List,
  Plus,
  Camera
} from "lucide-react"

interface Photo {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  originalUrl: string
  collectionId: string
  orderIndex: number
  createdAt: Date
}

interface PhotoSelection {
  photoId: string
  status: 'favorite' | 'approved' | 'rejected' | 'pending'
  comment?: string
  rating?: number
  timestamp: Date
  clientId: string
}

interface SelectionSession {
  id: string
  collectionId: string
  clientId: string
  clientName: string
  clientEmail: string
  status: 'active' | 'completed' | 'expired'
  deadline?: Date
  instructions?: string
  createdAt: Date
  updatedAt: Date
  selections: PhotoSelection[]
  allowDownload: boolean
  maxSelections?: number
}

interface ClientFavoritesSystemProps {
  photos: Photo[]
  collectionId: string
  isOpen: boolean
  onClose: () => void
  userRole: 'photographer' | 'admin' | 'client'
  userId: string
}

export function ClientFavoritesSystem({
  photos,
  collectionId,
  isOpen,
  onClose,
  userRole,
  userId
}: ClientFavoritesSystemProps) {
  const [sessions, setSessions] = useState<SelectionSession[]>([])
  const [currentSession, setCurrentSession] = useState<SelectionSession | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterStatus, setFilterStatus] = useState<'all' | 'favorite' | 'approved' | 'rejected' | 'pending'>('all')
  const [newComment, setNewComment] = useState("")
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)

  // Fetch sessions from API (real data)
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`/api/sessions?collectionId=${collectionId}&userId=${userId}`)
        if (!res.ok) throw new Error('Failed to fetch sessions')
        const data: SelectionSession[] = await res.json()
        setSessions(data)
        setCurrentSession(data[0] || null)
      } catch (error) {
        console.error('Error fetching sessions:', error)
      }
    }

    fetchSessions()
  }, [collectionId, userId])

  const getPhotoSelection = (photoId: string): PhotoSelection | undefined => {
    return currentSession?.selections.find(s => s.photoId === photoId)
  }

  const updatePhotoSelection = (photoId: string, status: PhotoSelection['status'], comment?: string, rating?: number) => {
    if (!currentSession) return

    const existingSelection = getPhotoSelection(photoId)
    const newSelection: PhotoSelection = {
      photoId,
      status,
      comment,
      rating,
      timestamp: new Date(),
      clientId: userId
    }

    const updatedSelections = existingSelection
      ? currentSession.selections.map(s => s.photoId === photoId ? newSelection : s)
      : [...currentSession.selections, newSelection]

    const updatedSession = {
      ...currentSession,
      selections: updatedSelections,
      updatedAt: new Date()
    }

    setCurrentSession(updatedSession)
    setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s))
  }

  const addComment = (photoId: string, comment: string) => {
    const selection = getPhotoSelection(photoId)
    updatePhotoSelection(
      photoId,
      selection?.status || 'pending',
      comment,
      selection?.rating
    )
    setNewComment("")
    setActivePhotoId(null)
  }

  const filteredPhotos = photos.filter(photo => {
    if (filterStatus === 'all') return true
    const selection = getPhotoSelection(photo.id)
    if (!selection && filterStatus === 'pending') return true
    return selection?.status === filterStatus
  })

  const getSelectionStats = () => {
    if (!currentSession) return { total: 0, favorites: 0, approved: 0, rejected: 0, pending: 0 }

    const stats = currentSession.selections.reduce((acc, selection) => {
      acc[selection.status]++
      return acc
    }, { favorite: 0, approved: 0, rejected: 0, pending: 0 })

    return {
      total: currentSession.selections.length,
      favorites: stats.favorite,
      approved: stats.approved,
      rejected: stats.rejected,
      pending: photos.length - currentSession.selections.length
    }
  }

  const stats = getSelectionStats()

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const renderPhotoCard = (photo: Photo) => {
    const selection = getPhotoSelection(photo.id)

    return (
      <div
        key={photo.id}
        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
          selection?.status === 'favorite' ? 'border-red-500' :
          selection?.status === 'approved' ? 'border-green-500' :
          selection?.status === 'rejected' ? 'border-red-300' :
          'border-transparent hover:border-primary/50'
        }`}
      >
        <div className={viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/3]'}>
          <img
            src={photo.thumbnailUrl}
            alt={photo.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Status Overlay */}
        {selection && (
          <div className={`absolute top-2 left-2 p-1 rounded-full ${
            selection.status === 'favorite' ? 'bg-red-500' :
            selection.status === 'approved' ? 'bg-green-500' :
            selection.status === 'rejected' ? 'bg-red-300' :
            'bg-gray-400'
          }`}>
            {selection.status === 'favorite' && <Heart className="h-4 w-4 text-white fill-white" />}
            {selection.status === 'approved' && <Check className="h-4 w-4 text-white" />}
            {selection.status === 'rejected' && <X className="h-4 w-4 text-white" />}
          </div>
        )}

        {/* Rating */}
        {selection?.rating && (
          <div className="absolute top-2 right-2 flex gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < selection.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all">
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1 justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => { e.stopPropagation(); updatePhotoSelection(photo.id, 'favorite') }}
              >
                <Heart className={`h-3 w-3 ${selection?.status === 'favorite' ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => { e.stopPropagation(); updatePhotoSelection(photo.id, 'approved') }}
              >
                <Check className={`h-3 w-3 ${selection?.status === 'approved' ? 'text-green-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => { e.stopPropagation(); updatePhotoSelection(photo.id, 'rejected') }}
              >
                <X className={`h-3 w-3 ${selection?.status === 'rejected' ? 'text-red-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => { e.stopPropagation(); setActivePhotoId(photo.id) }}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Comment Indicator */}
        {selection?.comment && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Note
            </Badge>
          </div>
        )}

        {/* Photo Info */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-white text-xs">
            <p className="truncate">{photo.originalFilename}</p>
            {selection?.comment && (
              <p className="text-white/80 text-xs mt-1 truncate">"{selection.comment}"</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Client Photo Selections
            {currentSession && (
              <Badge variant="secondary">
                {stats.total} of {photos.length} reviewed
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="selections" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="selections">Photo Selections</TabsTrigger>
            <TabsTrigger value="sessions">Session Management</TabsTrigger>
            <TabsTrigger value="summary">Selection Summary</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="selections" className="space-y-4 m-0">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'favorite' | 'approved' | 'rejected' | 'pending')}
                    className="px-3 py-1 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">All Photos ({photos.length})</option>
                    <option value="favorite">Favorites ({stats.favorites})</option>
                    <option value="approved">Approved ({stats.approved})</option>
                    <option value="rejected">Rejected ({stats.rejected})</option>
                    <option value="pending">Pending ({stats.pending})</option>
                  </select>

                  {/* View Mode */}
                  <div className="flex gap-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>{stats.favorites} favorites</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{stats.approved} approved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <X className="h-4 w-4 text-red-500" />
                    <span>{stats.rejected} rejected</span>
                  </div>
                </div>
              </div>

              {/* Photo Grid */}
              <div className={`grid gap-3 ${
                viewMode === 'grid'
                  ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
                  : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              }`}>
                {filteredPhotos.map(renderPhotoCard)}
              </div>
            </TabsContent>

            {/* Sessions and Summary tabs remain unchanged, just using real sessions */}
            {/* ... */}
          </div>
        </Tabs>

        {/* Comment Dialog */}
        <Dialog open={!!activePhotoId} onOpenChange={() => setActivePhotoId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your comment about this photo..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActivePhotoId(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => activePhotoId && addComment(activePhotoId, newComment)}
                  disabled={!newComment.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
