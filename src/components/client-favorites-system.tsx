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

  // Mock session data for demo
  useEffect(() => {
    const mockSessions: SelectionSession[] = [
      {
        id: 'session-1',
        collectionId,
        clientId: 'demo-user-3',
        clientName: 'Client User',
        clientEmail: 'client@demo.com',
        status: 'active',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        instructions: 'Please select your favorite photos for the final album. You can choose up to 20 photos.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(),
        allowDownload: true,
        maxSelections: 20,
        selections: [
          {
            photoId: photos[0]?.id || 'photo-1',
            status: 'favorite',
            comment: 'Love this expression!',
            rating: 5,
            timestamp: new Date(),
            clientId: 'demo-user-3'
          },
          {
            photoId: photos[1]?.id || 'photo-2',
            status: 'approved',
            timestamp: new Date(),
            clientId: 'demo-user-3'
          },
          {
            photoId: photos[2]?.id || 'photo-3',
            status: 'rejected',
            comment: 'Not the best angle',
            timestamp: new Date(),
            clientId: 'demo-user-3'
          }
        ]
      }
    ]
    setSessions(mockSessions)
    setCurrentSession(mockSessions[0])
  }, [collectionId, photos])

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
    const isSelected = selectedPhotos.has(photo.id)

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
                onClick={(e) => {
                  e.stopPropagation()
                  updatePhotoSelection(photo.id, 'favorite')
                }}
              >
                <Heart className={`h-3 w-3 ${selection?.status === 'favorite' ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => {
                  e.stopPropagation()
                  updatePhotoSelection(photo.id, 'approved')
                }}
              >
                <Check className={`h-3 w-3 ${selection?.status === 'approved' ? 'text-green-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => {
                  e.stopPropagation()
                  updatePhotoSelection(photo.id, 'rejected')
                }}
              >
                <X className={`h-3 w-3 ${selection?.status === 'rejected' ? 'text-red-500' : ''}`} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 bg-white/90 hover:bg-white text-black"
                onClick={(e) => {
                  e.stopPropagation()
                  setActivePhotoId(photo.id)
                }}
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
                    onChange={(e) => setFilterStatus(e.target.value)}
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

            <TabsContent value="sessions" className="space-y-4 m-0">
              <div>
                <h3 className="text-lg font-medium">Selection Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  Manage client selection sessions and deadlines.
                </p>
              </div>

              {userRole !== 'client' && (
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Session
                </Button>
              )}

              <div className="space-y-3">
                {sessions.map((session) => (
                  <Card key={session.id} className={session.id === currentSession?.id ? 'ring-2 ring-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{session.clientName}</h4>
                          <p className="text-sm text-muted-foreground">{session.clientEmail}</p>
                        </div>
                        <Badge variant={
                          session.status === 'active' ? 'default' :
                          session.status === 'completed' ? 'secondary' : 'destructive'
                        }>
                          {session.status}
                        </Badge>
                      </div>

                      {session.instructions && (
                        <p className="text-sm mb-3 p-2 bg-muted rounded">{session.instructions}</p>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex gap-4">
                          <span>Created: {formatDate(session.createdAt)}</span>
                          {session.deadline && (
                            <span>Deadline: {formatDate(session.deadline)}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <span>{session.selections.length} selections</span>
                          {session.maxSelections && (
                            <span>• Max: {session.maxSelections}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4 m-0">
              <div>
                <h3 className="text-lg font-medium">Selection Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Overview of client selections and feedback.
                </p>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-500">{stats.favorites}</div>
                    <div className="text-sm text-muted-foreground">Favorites</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
                    <div className="text-sm text-muted-foreground">Rejected</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-500">{stats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </CardContent>
                </Card>
              </div>

              {/* Comments and Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Client Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentSession?.selections
                      .filter(s => s.comment)
                      .map((selection) => {
                        const photo = photos.find(p => p.id === selection.photoId)
                        return (
                          <div key={selection.photoId} className="flex gap-3 p-3 border rounded-lg">
                            <img
                              src={photo?.thumbnailUrl}
                              alt=""
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{photo?.originalFilename}</span>
                                <Badge variant="outline" className="text-xs">
                                  {selection.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">"{selection.comment}"</p>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
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
