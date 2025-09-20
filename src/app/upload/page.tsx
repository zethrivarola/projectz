"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AppLayout } from "@/components/app-layout"
import { PhotoUpload } from "@/components/photo-upload"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ArrowLeft, AlertCircle, Camera, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  visibility: 'public' | 'private' | 'password_protected'
  isStarred: boolean
  isFeatured: boolean
  tags: string[]
  createdAt: string | Date
  updatedAt: string | Date
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  _count: {
    photos: number
  }
}

interface UploadedPhoto {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  highResUrl?: string
  originalUrl: string
  width: number
  height: number
  isRaw: boolean
  processingStatus: string
  uploadedAt: string
}

function UploadContent() {
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  const collectionId = searchParams.get('collection')

  const fetchCollection = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/collections', {
        credentials: 'include',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }

      const data = await response.json()
      const targetCollection = data.collections.find((c: Collection) => c.id === collectionId)

      if (!targetCollection) {
        throw new Error('Collection not found')
      }

      setCollection(targetCollection)
    } catch (error) {
      console.error('Error fetching collection:', error)
      setError(error instanceof Error ? error.message : 'Failed to load collection')
    } finally {
      setLoading(false)
    }
  }, [collectionId])

  useEffect(() => {
    if (!collectionId) {
      setError('No collection specified. Please select a collection first.')
      setLoading(false)
      return
    }

    fetchCollection()
  }, [collectionId, fetchCollection])

  const handleUploadComplete = (uploadedPhoto: UploadedPhoto) => {
    setUploadedPhotos(prev => [...prev, uploadedPhoto])
    setSuccessMessage(`${uploadedPhoto.originalFilename} uploaded successfully!`)
    console.log('Upload completed:', uploadedPhoto)

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('')
    }, 3000)
  }

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage)
    // Clear error message after 5 seconds
    setTimeout(() => {
      setError('')
    }, 5000)
  }

  const handleFinishUploading = () => {
    // Navigate back to collections with a flag to refresh
    router.push('/collections?refresh=true')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading collection...</p>
        </div>
      </div>
    )
  }

  if (error && !collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold">Upload Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Link href="/collections">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collections
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/collections">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collections
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Upload Photos</h1>
          <p className="text-muted-foreground">
            Add photos to <strong>{collection?.title}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Camera className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/10">
          <CardContent className="flex items-center gap-2 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-800 dark:text-green-400">{successMessage}</span>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 dark:text-red-400">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Collection Info */}
      {collection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Collection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Title:</span> {collection.title}
              </div>
              {collection.description && (
                <div>
                  <span className="font-medium">Description:</span> {collection.description}
                </div>
              )}
              <div>
                <span className="font-medium">Current Photos:</span> {collection._count.photos}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Component */}
      {collection && (
        <PhotoUpload
          collectionId={collection.id}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          maxFileSize={100}
        />
      )}

      {/* Uploaded Photos Summary */}
      {uploadedPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''} uploaded successfully
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedPhotos.map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalFilename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {photo.originalFilename}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <Button onClick={handleFinishUploading}>
                  View Collection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function UploadPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading upload page...</p>
          </div>
        </div>
      }>
        <UploadContent />
      </Suspense>
    </AppLayout>
  )
}