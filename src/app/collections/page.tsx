"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NewCollectionDialog } from "@/components/new-collection-dialog"
import { ShareCollectionDialog } from "@/components/share-collection-dialog"
import {
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  CalendarDays,
  Star,
  MoreVertical,
  Eye,
  Share2,
  Loader2,
  Camera,
  RefreshCw,
  X,
  Tag,
  Trash2
} from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  isStarred: boolean
  isFeatured: boolean
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

export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [authChecked, setAuthChecked] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [selectedCollectionForShare, setSelectedCollectionForShare] = useState<Collection | null>(null)

  // Filter state
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

  // Get unique tags from collections
  const availableTags = Array.from(
    new Set(collections.flatMap(collection => collection.tags))
  ).filter(Boolean)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shouldRefresh = params.get('refresh') === 'true'

    const timer = setTimeout(() => {
      fetchCollections()
    }, shouldRefresh ? 100 : 500)

    if (shouldRefresh) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    return () => clearTimeout(timer)
  }, [fetchCollections])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible, refreshing collections...')
        fetchCollections()
      }
    }

    const handleFocus = () => {
      console.log('Window focused, refreshing collections...')
      fetchCollections()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchCollections])

  const refreshCollections = () => {
    console.log('Manual refresh triggered')
    fetchCollections()
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

      console.log('Fetching collections...')

      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      console.log('Auth check response:', authResponse.status)

      if (!authResponse.ok) {
        console.log('Authentication failed, redirecting to login')
        router.push('/login')
        return
      }

      const authData = await authResponse.json()
      console.log('Authentication verified for:', authData.user.email)
      setAuthChecked(true)

      const response = await fetch('/api/collections', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      console.log('Collections response status:', response.status)

      if (response.status === 401) {
        console.log('Collections API returned 401, redirecting to login')
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch collections (${response.status})`)
      }

      const data = await response.json()
      setCollections(data.collections)
      console.log('Collections loaded:', data.collections.length)

    } catch (error) {
      console.error('Error fetching collections:', error)
      setError(error instanceof Error ? error.message : 'Failed to load collections')

      if (error instanceof Error && !error.message.includes('401')) {
        console.log('Network error detected, not redirecting to login')
      }
    } finally {
      setLoading(false)
    }
  }, [router, setLoading, setError, setAuthChecked, setCollections, getAuthHeaders]);

  const handleNewCollection = (newCollection: Collection) => {
    setCollections(prev => [newCollection, ...prev])
    console.log('New collection added to list:', newCollection.title)
  }

  const handleDeleteCollection = async (collection: Collection) => {
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

      // Remove from local state
      setCollections(prev => prev.filter(c => c.id !== collection.id))
      console.log('Collection deleted:', collection.title)

    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Failed to delete collection. Please try again.')
    }
  }

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
    // Search filter
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      const matchesSearch = 
        collection.title.toLowerCase().includes(searchLower) ||
        collection.description?.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Status filter
    if (filters.status !== "all") {
      switch (filters.status) {
        case "active":
          if (collection.visibility !== "public" && collection.visibility !== "password_protected") return false
          break
        case "draft":
          if (collection.visibility !== "private") return false
          break
        case "archived":
          // For now, treat private collections as archived
          if (collection.visibility !== "private") return false
          break
        case "shared":
          if (collection.visibility === "private") return false
          break
      }
    }

    // Category tag filter
    if (filters.categoryTag && !collection.tags.includes(filters.categoryTag)) {
      return false
    }

    // Starred filter
    if (filters.starred && !collection.isStarred) {
      return false
    }

    // Event date filter
    if (filters.eventDateFrom || filters.eventDateTo) {
      const eventDate = collection.dateTaken ? new Date(collection.dateTaken) : null
      
      if (!eventDate) return false
      
      if (filters.eventDateFrom && eventDate < filters.eventDateFrom) return false
      if (filters.eventDateTo && eventDate > filters.eventDateTo) return false
    }

    // Entry date filter
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
        return 'Active'
      case 'password_protected':
        return 'Protected'
      case 'private':
        return 'Draft'
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
              <h1 className="text-2xl font-semibold text-foreground">Collections</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCollections}
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                View Presets
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

          {/* Filters and Search */}
          <div className="flex items-center justify-between px-6 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search collections..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="pl-9 w-64"
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
                    {filters.status !== "all" && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {filters.status}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="start">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Collection Status</Label>
                    <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Collections</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Category Tag Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={filters.categoryTag ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <Tag className="h-4 w-4" />
                    Category Tag
                    {filters.categoryTag && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {filters.categoryTag}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-muted-foreground">Filter by Tag</Label>
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
                    
                    {availableTags.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No tags available
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Event Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={filters.eventDateFrom || filters.eventDateTo ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Event Date
                    {(filters.eventDateFrom || filters.eventDateTo) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {filters.eventDateFrom ? filters.eventDateFrom.toLocaleDateString() : "Start"} - {filters.eventDateTo ? filters.eventDateTo.toLocaleDateString() : "End"}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Event Date Range</Label>
                      <p className="text-xs text-muted-foreground mt-1">Filter collections by when the event took place</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input
                          type="date"
                          value={filters.eventDateFrom ? filters.eventDateFrom.toISOString().split('T')[0] : ''}
                          onChange={(e) => updateFilters({ eventDateFrom: e.target.value ? new Date(e.target.value) : null })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input
                          type="date"
                          value={filters.eventDateTo ? filters.eventDateTo.toISOString().split('T')[0] : ''}
                          onChange={(e) => updateFilters({ eventDateTo: e.target.value ? new Date(e.target.value) : null })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateFilters({ eventDateFrom: null, eventDateTo: null })}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Entry Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={filters.entryDateFrom || filters.entryDateTo ? "default" : "outline"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Entry Date
                    {(filters.entryDateFrom || filters.entryDateTo) && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {filters.entryDateFrom ? filters.entryDateFrom.toLocaleDateString() : "Start"} - {filters.entryDateTo ? filters.entryDateTo.toLocaleDateString() : "End"}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Creation Date Range</Label>
                      <p className="text-xs text-muted-foreground mt-1">Filter collections by when they were created</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input
                          type="date"
                          value={filters.entryDateFrom ? filters.entryDateFrom.toISOString().split('T')[0] : ''}
                          onChange={(e) => updateFilters({ entryDateFrom: e.target.value ? new Date(e.target.value) : null })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input
                          type="date"
                          value={filters.entryDateTo ? filters.entryDateTo.toISOString().split('T')[0] : ''}
                          onChange={(e) => updateFilters({ entryDateTo: e.target.value ? new Date(e.target.value) : null })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateFilters({ entryDateFrom: null, entryDateTo: null })}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Starred Filter */}
              <Button
                variant={filters.starred ? "default" : "outline"}
                size="sm"
                onClick={() => updateFilters({ starred: !filters.starred })}
                className="gap-2"
              >
                <Star className={`h-4 w-4 ${filters.starred ? 'fill-current' : ''}`} />
                Starred
              </Button>

              {/* Clear All Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

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

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Active filters:</span>
                <div className="flex gap-2 flex-wrap">
                  {filters.searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {filters.searchQuery}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-foreground" 
                        onClick={() => updateFilters({ searchQuery: "" })}
                      />
                    </Badge>
                  )}
                  {filters.status !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {filters.status}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-foreground" 
                        onClick={() => updateFilters({ status: "all" })}
                      />
                    </Badge>
                  )}
                  {filters.categoryTag && (
                    <Badge variant="secondary" className="gap-1">
                      Tag: {filters.categoryTag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-foreground" 
                        onClick={() => updateFilters({ categoryTag: "" })}
                      />
                    </Badge>
                  )}
                  {filters.starred && (
                    <Badge variant="secondary" className="gap-1">
                      Starred
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-foreground" 
                        onClick={() => updateFilters({ starred: false })}
                      />
                    </Badge>
                  )}
                  {(filters.eventDateFrom || filters.eventDateTo) && (
                    <Badge variant="secondary" className="gap-1">
                      Event Date: {filters.eventDateFrom?.toLocaleDateString() || "Start"} - {filters.eventDateTo?.toLocaleDateString() || "End"}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-foreground" 
                        onClick={() => updateFilters({ eventDateFrom: null, eventDateTo: null })}
                      />
                    </Badge>
                  )}
                  {(filters.entryDateFrom || filters.entryDateTo) && (
                    <Badge variant="secondary" className="gap-1">
                      Entry Date: {filters.entryDateFrom?.toLocaleDateString() || "Start"} - {filters.entryDateTo?.toLocaleDateString() || "End"}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-foreground" 
                        onClick={() => updateFilters({ entryDateFrom: null, entryDateTo: null })}
                      />
                    </Badge>
                  )}
                </div>
                <span className="ml-2">({filteredCollections.length} of {collections.length} collections)</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
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
                    ? 'Try adjusting your filters to see more results'
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
            <div className="gallery-grid vertical">
              {filteredCollections.map((collection) => {
                // Get focus settings from collection design
                const focusX = collection.design?.coverFocus?.x ?? 50
                const focusY = collection.design?.coverFocus?.y ?? 50
                
                return (
                  <div key={collection.id} className="collection-card group">
                    <Link href={`/collections/${collection.slug}`}>
                      <div className="collection-card-overlay" />
                      <div className="relative">
                        {collection.coverPhoto ? (
                          <img
                            src={collection.coverPhoto.thumbnailUrl}
                            alt={collection.title}
                            className="collection-card-image"
                            style={{
                              objectPosition: `${focusX}% ${focusY}%`
                            }}
                          />
                        ) : (
                          <div className="collection-card-image bg-muted flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <Camera className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-sm">No photos yet</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Top Left - Star */}
                        {collection.isStarred && (
                          <div className="absolute top-2 left-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          </div>
                        )}
                        
                        {/* Top Right - Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                setSelectedCollectionForShare(collection)
                                setShowShareDialog(true)
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                window.open(`/collections/${collection.slug}/preview`, '_blank')
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                handleDeleteCollection(collection)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Bottom Right - Tags */}
                        {collection.tags.length > 0 && (
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-1 max-w-[120px] overflow-hidden">
                              {collection.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {collection.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{collection.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                    
                    <div className="collection-card-content">
                      <Link href={`/collections/${collection.slug}`}>
                        <h3 className="collection-card-title">{collection.title}</h3>
                      </Link>
                      <div className="collection-card-meta">
                        <div className={`flex items-center gap-1 ${getStatusColor(collection.visibility)}`}>
                          <div className="w-2 h-2 bg-current rounded-full"></div>
                          <span>{collection._count.photos} items • {getStatusText(collection.visibility)}</span>
                        </div>
                        <div className="text-xs mt-1">{formatDate(collection.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-2">
                {filteredCollections.map((collection) => {
                  // Get focus settings from collection design
                  const focusX = collection.design?.coverFocus?.x ?? 50
                  const focusY = collection.design?.coverFocus?.y ?? 50
                  
                  return (
                    <div
                      key={collection.id}
                      className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow group"
                    >
                      {collection.coverPhoto ? (
                        <img
                          src={collection.coverPhoto.thumbnailUrl}
                          alt={collection.title}
                          className="w-20 h-15 object-cover rounded"
                          style={{
                            objectPosition: `${focusX}% ${focusY}%`
                          }}
                        />
                      ) : (
                        <div className="w-20 h-15 bg-muted rounded flex items-center justify-center">
                          <Camera className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/collections/${collection.slug}`}
                            className="font-medium hover:text-primary"
                          >
                            {collection.title}
                          </Link>
                          {collection.isStarred && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          {collection.tags.length > 0 && (
                            <div className="flex gap-1">
                              {collection.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {collection._count.photos} items • {formatDate(collection.createdAt)}
                        </div>
                        {collection.description && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {collection.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-sm ${getStatusColor(collection.visibility)}`}>
                          <div className="w-2 h-2 bg-current rounded-full"></div>
                          <span>{getStatusText(collection.visibility)}</span>
                        </div>
                        
                        {/* Actions Menu */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedCollectionForShare(collection)
                              setShowShareDialog(true)
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(`/collections/${collection.slug}/preview`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCollection(collection)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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