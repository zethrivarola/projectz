"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NewCollectionDialog } from "@/components/new-collection-dialog"
import { ShareCollectionDialog } from "@/components/share-collection-dialog"
import {
  Plus,
  Eye,
  Share2,
  Loader2,
  Camera,
  RefreshCw,
  Trash2,
  Settings,
  Search,
  Filter,
  Grid3x3,
  List,
  CalendarDays,
  Star,
  Tag,
  X,
  HardDrive
} from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  isStarred: boolean
  tags: string[]
  visibility: string
  createdAt: Date
  updatedAt: Date
  dateTaken?: Date
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
  totalSizeBytes?: string
}

interface FilterState {
  searchQuery: string
  status: string
  categoryTag: string
  eventDateFrom: Date | null
  eventDateTo: Date | null
  entryDateFrom: Date | null
  entryDateTo: Date | null
  starred: boolean
}

export default function AdminDashboard() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [authChecked, setAuthChecked] = useState(false)
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const handleOpenShareDialog = (collection: Collection) => {
  console.log('📂 Opening share dialog for:', collection.title)
  setSelectedCollectionForShare(collection)
  setShowShareDialog(true)
}
  const [selectedCollectionForShare, setSelectedCollectionForShare] = useState<Collection | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    status: "all",
    categoryTag: "",
    eventDateFrom: null,
    eventDateTo: null,
    entryDateFrom: null,
    entryDateTo: null,
    starred: false
  })
// Helper para formatear bytes a GB/MB
  const formatSize = (sizeBytes: string | undefined) => {
    if (!sizeBytes) return '0 MB'
    
    const bytes = BigInt(sizeBytes)
    const gb = Number(bytes) / (1024 * 1024 * 1024)
    const mb = Number(bytes) / (1024 * 1024)
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`
    } else {
      return `${mb.toFixed(0)} MB`
    }
  }

  // Helper para color del badge según tamaño
  const getSizeBadgeVariant = (sizeBytes: string | undefined): "default" | "secondary" | "destructive" => {
    if (!sizeBytes) return 'secondary'
    
    const bytes = BigInt(sizeBytes)
    const gb = Number(bytes) / (1024 * 1024 * 1024)
    
    if (gb < 1) return 'secondary' // Verde/gris para < 1GB
    if (gb < 10) return 'default'  // Amarillo para 1-10GB
    return 'destructive'           // Rojo para > 10GB
  }

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

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      setAuthChecked(true)

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
      setCollections(data.collections)

    } catch (error) {
      console.error('Error fetching collections:', error)
      setError(error instanceof Error ? error.message : 'Failed to load collections')
    } finally {
      setLoading(false)
    }
  }, [router, getAuthHeaders])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const handleCollectionVisibilityChange = async (collection: Collection, newVisibility: string) => {
    try {
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ visibility: newVisibility })
      })

      if (!response.ok) {
        throw new Error('Failed to update visibility')
      }

      setCollections(prev => prev.map(c => 
        c.id === collection.id 
          ? { ...c, visibility: newVisibility } 
          : c
      ))
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Failed to update visibility')
    }
  }

  const handleNewCollection = (newCollection: Collection) => {
    setCollections(prev => [newCollection, ...prev])
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

const handleToggleStar = async (collection: Collection) => {
  try {
    const response = await fetch(`/api/collections/${collection.slug}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ isStarred: !collection.isStarred })
    })

    if (!response.ok) {
      throw new Error('Failed to update collection')
    }

    setCollections(prev => prev.map(c => 
      c.id === collection.id 
        ? { ...c, isStarred: !c.isStarred } 
        : c
    ))
  } catch (error) {
    console.error('Error toggling star:', error)
    alert('Failed to update collection')
  }
};

  const availableTags = Array.from(
    new Set(collections.flatMap(collection => collection.tags))
  ).filter(Boolean)

  const updateFilters = (update: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...update }))
  }

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      status: "all",
      categoryTag: "",
      eventDateFrom: null,
      eventDateTo: null,
      entryDateFrom: null,
      entryDateTo: null,
      starred: false
    })
  }

  const filteredCollections = collections.filter(collection => {
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      const matchesSearch = 
        collection.title.toLowerCase().includes(searchLower) ||
        collection.description?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    if (filters.status !== "all") {
      switch (filters.status) {
        case "active":
          if (collection.visibility !== "public" && collection.visibility !== "password_protected") return false
          break
        case "draft":
          if (collection.visibility !== "private") return false
          break
        case "shared":
          if (collection.visibility === "private") return false
          break
      }
    }

    if (filters.categoryTag && !collection.tags.includes(filters.categoryTag)) {
      return false
    }

    if (filters.starred && !collection.isStarred) {
      return false
    }

    if (filters.eventDateFrom || filters.eventDateTo) {
      const eventDate = collection.dateTaken ? new Date(collection.dateTaken) : null
      if (!eventDate) return false
      if (filters.eventDateFrom && eventDate < filters.eventDateFrom) return false
      if (filters.eventDateTo && eventDate > filters.eventDateTo) return false
    }

    if (filters.entryDateFrom || filters.entryDateTo) {
      const entryDate = new Date(collection.createdAt)
      if (filters.entryDateFrom && entryDate < filters.entryDateFrom) return false
      if (filters.entryDateTo && entryDate > filters.entryDateTo) return false
    }

    return true
  })

  const hasActiveFilters = filters.searchQuery || 
    filters.status !== "all" || 
    filters.categoryTag || 
    filters.eventDateFrom || 
    filters.eventDateTo || 
    filters.entryDateFrom || 
    filters.entryDateTo || 
    filters.starred

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'text-green-600'
      case 'password_protected':
        return 'text-blue-600'
      case 'private':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking authentication...</span>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Manage your photography collections</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCollections()}
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setShowNewCollectionDialog(true)}
              >
                <Plus className="h-4 w-4" />
                New Collection
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between px-6 pb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search collections..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="pl-9 w-48"
                />
              </div>

              {/* Status Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={filters.status !== "all" ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Status
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Collection Status</Label>
                    <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Collections</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Tag Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={filters.categoryTag ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <Tag className="h-4 w-4" />
                    Tag
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Filter by Tag</Label>
                    <Select value={filters.categoryTag} onValueChange={(value) => updateFilters({ categoryTag: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tag..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Tags</SelectItem>
                        {availableTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Starred */}
              <Button
                variant={filters.starred ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters({ starred: !filters.starred })}
                className="gap-2"
              >
                <Star className={`h-4 w-4 ${filters.starred ? 'fill-current' : ''}`} />
              </Button>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading collections...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error loading collections</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchCollections}>Retry</Button>
              </div>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">
                  {hasActiveFilters ? 'No collections match your filters' : 'No collections yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'Create your first collection to get started'
                  }
                </p>
                {hasActiveFilters ? (
                  <Button onClick={clearFilters} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => setShowNewCollectionDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Collection
                  </Button>
                )}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
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
  title={collection.isStarred ? "Remove from starred" : "Add to starred"}
  className="absolute top-3 left-3 z-10"
>
  <Star className={`h-3 w-3 ${collection.isStarred ? 'fill-current' : ''}`} />
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
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-sm text-muted-foreground">
                            {collection._count.photos} photos
                          </p>
                          <span className="text-muted-foreground">•</span>
                          <Badge variant={getSizeBadgeVariant(collection.totalSizeBytes)} className="gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatSize(collection.totalSizeBytes)}
                          </Badge>
                        </div>
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

                    <div className="space-y-2">
                      <label className="text-xs font-medium">Visibility</label>
                      <Select 
                        value={collection.visibility} 
                        onValueChange={(value) => handleCollectionVisibilityChange(collection, value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="password_protected">Protected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
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
                        variant="outline"
                        onClick={(e) => {
  e.stopPropagation()
  handleOpenShareDialog(collection)
}}
                        className="gap-1"
                      >
                        <Share2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Share</span>
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
          ) : (
            <div className="space-y-2">
              {filteredCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow group"
                >
                  {collection.coverPhoto ? (
  <img
    src={collection.coverPhoto.thumbnailUrl}
    alt={collection.title}
    className="w-20 h-16 object-cover rounded"
    style={{
      objectPosition: `${collection.coverFocalPoint?.x || 50}% ${collection.coverFocalPoint?.y || 50}%`
    }}
  />
) : (
  <div className="w-20 h-16 bg-muted rounded flex items-center justify-center">
    <Camera className="h-6 w-6 text-muted-foreground" />
  </div>
)}
<div className="flex-1">
                    <h3 className="font-medium">{collection.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-sm text-muted-foreground">
                        {collection._count.photos} photos • {formatDate(collection.createdAt)}
                      </div>
                      <Badge variant={getSizeBadgeVariant(collection.totalSizeBytes)} className="gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatSize(collection.totalSizeBytes)}
                      </Badge>
                    </div>
                    {collection.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(collection.visibility)}>
                      {getStatusText(collection.visibility)}
                    </Badge>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => router.push(`/admin/collections/${collection.slug}/design`)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
  e.stopPropagation()
  window.open(`/admin/collections/${collection.slug}/preview`, '_blank')
}}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
  e.stopPropagation()
  handleOpenShareDialog(collection)
}}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteCollection(collection)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewCollectionDialog
        open={showNewCollectionDialog}
        onOpenChange={setShowNewCollectionDialog}
        onSuccess={handleNewCollection}
      />

      {selectedCollectionForShare && (
        <ShareCollectionDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          collection={{
            id: selectedCollectionForShare.id,
            title: selectedCollectionForShare.title,
            slug: selectedCollectionForShare.slug,
            photoCount: selectedCollectionForShare._count.photos,
          }}
        />
      )}
    </AppLayout>
  )
}
