"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  X,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Camera,
  Loader2
} from "lucide-react"

interface PhotoUploadProps {
  collectionId: string
  onUploadComplete?: (uploadedPhoto: UploadedPhoto) => void
  onUploadError?: (error: string) => void
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
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

interface UploadProgress {
  filename: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  result?: UploadedPhoto
}

export function PhotoUpload({
  collectionId,
  onUploadComplete,
  onUploadError,
  maxFileSize = 100, // 100MB default
  acceptedTypes = [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'image/x-canon-cr2',
    'image/x-canon-crw',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-panasonic-raw'
  ]
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  

  const handleFiles = useCallback(async (files: FileList) => {
  // MOVER validateFile AQUÍ DENTRO
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 100 * 1024 * 1024 // 100MB

    if (!allowedTypes.includes(file.type)) {
      return `${file.name}: Tipo de archivo no soportado`
    }

    if (file.size > maxSize) {
      return `${file.name}: El archivo es muy grande`
    }

    return null
  }

  // MOVER uploadFile AQUÍ DENTRO
  const uploadFile = async (file: File) => {
  console.log('uploadFile called for', file.name)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('collectionId', collectionId)

  const response = await fetch('/api/photos/upload', {
    method: 'POST',
    body: formData,
  })

  console.log('Upload response status:', response.status)

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  const result = await response.json()
  console.log('Upload result:', result)

  return result
}

  // EL RESTO DE TU CÓDIGO ACTUAL PERMANECE IGUAL
  const fileArray = Array.from(files)
  for (const file of fileArray) {
  const fileId = `${file.name}-${Date.now()}`
  const validationError = validateFile(file)
  if (validationError) {
    setUploads(prev => new Map(prev.set(fileId, {
      filename: file.name,
      progress: 0,
      status: 'error',
      error: validationError
    })))
    onUploadError?.(validationError)
    continue
  }

  // Agregamos el estado inicial de subida
  setUploads(prev => new Map(prev.set(fileId, {
    filename: file.name,
    progress: 0,
    status: 'uploading'
  })))

  try {
    const result = await uploadFile(file)

    // Actualizamos el estado cuando se completa
    setUploads(prev => new Map(prev.set(fileId, {
      filename: file.name,
      progress: 100,
      status: 'completed',
      result
    })))

    onUploadComplete?.(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    setUploads(prev => new Map(prev.set(fileId, {
      filename: file.name,
      progress: 0,
      status: 'error',
      error: errorMessage
    })))
    onUploadError?.(errorMessage)
  }
}
}, [onUploadComplete, onUploadError, collectionId]) // REMOVER validateFile y uploadFile de las dependencias

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
		console.log('Files selected:', files)
      handleFiles(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  const removeUpload = (fileId: string) => {
    setUploads(prev => {
      const newMap = new Map(prev)
      newMap.delete(fileId)
      return newMap
    })
  }

  const clearCompleted = () => {
    setUploads(prev => {
      const newMap = new Map()
      for (const [key, value] of prev) {
        if (value.status !== 'completed') {
          newMap.set(key, value)
        }
      }
      return newMap
    })
  }

  const uploadArray = Array.from(uploads.entries())
  const hasUploads = uploadArray.length > 0
  const hasCompleted = uploadArray.some(([, upload]) => upload.status === 'completed')

  return (
    <div className="space-y-4">
      {/* Upload Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="mb-4">
            {isDragging ? (
              <Upload className="h-12 w-12 text-primary animate-pulse" />
            ) : (
              <Camera className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop your photos here' : 'Upload Photos'}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Drag and drop your photos here, or click to select files.
            Supports JPEG, PNG, TIFF, WebP, and RAW formats.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Maximum file size: {maxFileSize}MB per file
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {hasUploads && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Upload Progress</h4>
              {hasCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompleted}
                >
                  Clear Completed
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {uploadArray.map(([fileId, upload]) => (
                <div key={fileId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {upload.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : upload.status === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      <span className="text-sm font-medium truncate">
                        {upload.filename}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {upload.status === 'uploading' && 'Uploading...'}
                        {upload.status === 'processing' && 'Processing...'}
                        {upload.status === 'completed' && 'Complete'}
                        {upload.status === 'error' && 'Failed'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(fileId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {upload.status !== 'error' ? (
                    <Progress value={upload.progress} className="h-2" />
                  ) : (
                    <p className="text-sm text-red-500">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
