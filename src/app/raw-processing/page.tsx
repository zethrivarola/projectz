"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RawProcessorInterface } from "@/components/raw-processor-interface"
import {
  Camera,
  Upload,
  Search,
  Filter,
  Grid3x3,
  List,
  Settings,
  Download,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface Collection {
  slug: string
  title: string
}

interface RawPhoto {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  isRaw: boolean
  rawFormat?: string
  processingStatus: string
  fileSize: number
  collectionTitle?: string
  exifData?: {
    iso?: number
    fNumber?: number
    exposureTime?: string
    focalLength?: number
    make?: string
    model?: string
  }
}

interface StatusCounts {
  all: number
  pending: number
  processing: number
  completed: number
  failed: number
}

export default function RawProcessingPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<RawPhoto | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showProcessor, setShowProcessor] = useState(false)
  const [rawPhotos, setRawPhotos] = useState<RawPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchRawPhotos()
  }, [])

  const fetchRawPhotos = async (): Promise<void> => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Fetch all collections to get RAW photos from them
      const response = await fetch('/api/collections', {
        credentials: 'include',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }

      const data = await response.json()
      const allRawPhotos: RawPhoto[] = []

      // Fetch photos from each collection and filter for RAW files
      for (const collection of data.collections as Collection[]) {
        try {
          const collectionResponse = await fetch(`/api/collections/${collection.slug}`, {
            credentials: 'include',
            headers
          })

          if (collectionResponse.ok) {
            const collectionData = await collectionResponse.json()
            const rawPhotosInCollection = collectionData.photos
              .filter((photo: RawPhoto) => photo.isRaw)
              .map((photo: RawPhoto) => ({
                ...photo,
                collectionTitle: collection.title
              }))

            allRawPhotos.push(...rawPhotosInCollection)
          }
        } catch (error) {
          console.warn(`Failed to fetch photos from collection ${collection.slug}:`, error)
        }
      }

      setRawPhotos(allRawPhotos)
    } catch (error) {
      console.error('Error fetching RAW photos:', error)
      setError(error instanceof Error ? error.message : 'Failed to load RAW photos')
    } finally {
      setLoading(false)
    }
  }

  const filteredPhotos = rawPhotos.filter(photo => {
    const matchesSearch = photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         photo.collectionTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || photo.processingStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const handleProcessPhoto = (photo: RawPhoto) => {
    setSelectedPhoto(photo)
    setShowProcessor(true)
  }

  const handleProcessingComplete = (processedUrl: string) => {
    console.log('Processing completed:', processedUrl)
    setShowProcessor(false)
    setSelectedPhoto(null)
    // In a real app, we'd update the photo status in the list
  }

  const statusCounts: StatusCounts = {
    all: rawPhotos.length,
    pending: rawPhotos.filter(p => p.processingStatus === 'pending').length,
    processing: rawPhotos.filter(p => p.processingStatus === 'processing').length,
    completed: rawPhotos.filter(p => p.processingStatus === 'completed').length,
    failed: rawPhotos.filter(p => p.processingStatus === 'failed').length,
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading RAW photos...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <Zap className="h-6 w-6" />
                RAW Processing
              </h1>
              <p className="text-sm text-muted-foreground">
                Process your RAW photos with professional controls
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Batch Process
              </Button>
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload RAW Files
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex items-center justify-between px-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search RAW files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>

              {/* Status Filters */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'processing', label: 'Processing' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'failed', label: 'Failed' },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={statusFilter === filter.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(filter.key)}
                    className="gap-2"
                  >
                    {filter.label}
                    <Badge variant="secondary" className="ml-1">
                      {statusCounts[filter.key as keyof StatusCounts]}
                    </Badge>
                  </Button>
                ))}
              </div>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {filteredPhotos.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No RAW photos found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Upload some RAW photos to get started"
                  }
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload RAW Files
                  </Button>
                )}
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredPhotos.map((photo) => (
                  <Card
                    key={photo.id}
                    className="group cursor-pointer transition-all hover:shadow-md"
                    onClick={() => handleProcessPhoto(photo)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg">
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.filename}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />

                        {/* RAW Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            {photo.rawFormat || 'RAW'}
                          </Badge>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <Badge variant="outline" className={`text-xs ${getStatusColor(photo.processingStatus)}`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(photo.processingStatus)}
                              {photo.processingStatus}
                            </span>
                          </Badge>
                        </div>

                        {/* Process Button Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" className="gap-2">
                              <Zap className="h-4 w-4" />
                              Process
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3">
                        <h4 className="font-medium text-sm truncate">{photo.filename}</h4>
                        <p className="text-xs text-muted-foreground truncate">{photo.collectionTitle}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{(photo.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>ISO {photo.exifData?.iso || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-2">
                {filteredPhotos.map((photo) => (
                  <Card
                    key={photo.id}
                    className="cursor-pointer transition-all hover:shadow-sm"
                    onClick={() => handleProcessPhoto(photo)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.filename}
                          className="w-16 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{photo.filename}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {photo.rawFormat || 'RAW'}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(photo.processingStatus)}`}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(photo.processingStatus)}
                                {photo.processingStatus}
                              </span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{photo.collectionTitle}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{(photo.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                            <span>ISO {photo.exifData?.iso || 'N/A'}</span>
                            <span>f/{photo.exifData?.fNumber || 'N/A'}</span>
                            <span>{photo.exifData?.exposureTime || 'N/A'}s</span>
                            <span>{photo.exifData?.focalLength || 'N/A'}mm</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="gap-2">
                            <Zap className="h-4 w-4" />
                            Process
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredPhotos.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                  <Camera className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">No RAW files found</h2>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Upload some RAW photos to get started with processing"
                  }
                </p>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload RAW Files
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RAW Processor Modal */}
      {showProcessor && selectedPhoto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden">
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">RAW Photo Processing</h2>
                  <Badge variant="secondary">{selectedPhoto.rawFormat || 'RAW'}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProcessor(false)}
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="p-6 h-full overflow-auto">
              <RawProcessorInterface
                photo={selectedPhoto}
                onProcessingComplete={handleProcessingComplete}
              />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}