"use client"

import { useState, useCallback, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  Upload,
  Plus,
  X,
  Eye,
  EyeOff,
  MoreVertical,
  Droplets,
  Download,
  Save,
  Trash2
} from "lucide-react"

interface Watermark {
  id: string
  name: string
  fileUrl: string
  position: string
  scale: number
  opacity: number
  createdAt: string
}

interface WatermarkManagerProps {
  onWatermarkSelect?: (watermark: Watermark) => void
  selectedWatermarkId?: string
}

const POSITION_OPTIONS = [
  { value: 'top_left', label: 'Top Left' },
  { value: 'top_right', label: 'Top Right' },
  { value: 'bottom_left', label: 'Bottom Left' },
  { value: 'bottom_right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
]

export function WatermarkManager({ onWatermarkSelect, selectedWatermarkId }: WatermarkManagerProps) {
  const [watermarks, setWatermarks] = useState<Watermark[]>([
    {
      id: '1',
      name: 'My Watermark 1',
      fileUrl: '/api/placeholder/200/100?text=WATERMARK',
      position: 'bottom_right',
      scale: 0.15,
      opacity: 0.8,
      createdAt: new Date().toISOString(),
    }
  ])
  const [isUploading, setIsUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [editingWatermark, setEditingWatermark] = useState<Watermark | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('watermark', file)
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''))

      const response = await fetch('/api/watermarks', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload watermark')
      }

      const newWatermark = await response.json()
      setWatermarks([...watermarks, newWatermark])

    } catch (error) {
      console.error('Watermark upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }, [watermarks])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
    },
    maxFiles: 1,
    multiple: false
  })

  const updateWatermark = async (watermark: Watermark) => {
    try {
      const response = await fetch(`/api/watermarks/${watermark.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: watermark.name,
          position: watermark.position,
          scale: watermark.scale,
          opacity: watermark.opacity,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update watermark')
      }

      const updatedWatermark = await response.json()
      setWatermarks(watermarks.map(w => w.id === watermark.id ? updatedWatermark : w))
      setEditingWatermark(null)

    } catch (error) {
      console.error('Watermark update error:', error)
    }
  }

  const deleteWatermark = async (watermarkId: string) => {
    if (!confirm('Are you sure you want to delete this watermark?')) return

    try {
      const response = await fetch(`/api/watermarks/${watermarkId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete watermark')
      }

      setWatermarks(watermarks.filter(w => w.id !== watermarkId))

    } catch (error) {
      console.error('Watermark delete error:', error)
    }
  }

  const generatePreview = (watermark: Watermark) => {
    // Generate a preview URL with watermark applied
    return `/api/watermarks/${watermark.id}/preview?position=${watermark.position}&scale=${watermark.scale}&opacity=${watermark.opacity}`
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Watermark Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />

            {isDragActive ? (
              <p className="text-primary font-medium">Drop your watermark here...</p>
            ) : (
              <div>
                <p className="font-medium mb-2">Upload New Watermark</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag & drop a PNG file with transparency
                </p>
                <Button variant="outline" size="sm" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Choose File'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Watermarks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {watermarks.map((watermark) => (
          <Card
            key={watermark.id}
            className={`group cursor-pointer transition-all hover:shadow-md ${
              selectedWatermarkId === watermark.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onWatermarkSelect?.(watermark)}
          >
            <CardContent className="p-4">
              {/* Watermark Preview */}
              <div className="aspect-video bg-muted rounded-lg mb-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    Preview Photo
                  </div>
                </div>

                {/* Watermark Overlay */}
                <div
                  className={`absolute ${getPositionClasses(watermark.position)}`}
                  style={{
                    opacity: watermark.opacity,
                    transform: `scale(${watermark.scale})`,
                  }}
                >
                  <img
                    src={watermark.fileUrl}
                    alt={watermark.name}
                    className="max-w-none"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                  />
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingWatermark(watermark)
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteWatermark(watermark.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Watermark Info */}
              <div>
                <h4 className="font-medium truncate">{watermark.name}</h4>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="capitalize">{watermark.position.replace('_', ' ')}</span>
                  <span className="mx-1">•</span>
                  <span>{Math.round(watermark.scale * 100)}% size</span>
                  <span className="mx-1">•</span>
                  <span>{Math.round(watermark.opacity * 100)}% opacity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Card */}
        <Card className="border-dashed group cursor-pointer hover:shadow-md transition-all">
          <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <h4 className="font-medium">Add Watermark</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a new watermark
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edit Watermark Dialog */}
      {editingWatermark && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Watermark</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingWatermark(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label>Watermark Name</Label>
                <Input
                  value={editingWatermark.name}
                  onChange={(e) => setEditingWatermark({
                    ...editingWatermark,
                    name: e.target.value
                  })}
                />
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <div className="grid grid-cols-3 gap-2">
                  {POSITION_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={editingWatermark.position === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditingWatermark({
                        ...editingWatermark,
                        position: option.value
                      })}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <Label>Size: {Math.round(editingWatermark.scale * 100)}%</Label>
                <Slider
                  value={[editingWatermark.scale]}
                  onValueChange={([value]) => setEditingWatermark({
                    ...editingWatermark,
                    scale: value
                  })}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                />
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <Label>Opacity: {Math.round(editingWatermark.opacity * 100)}%</Label>
                <Slider
                  value={[editingWatermark.opacity]}
                  onValueChange={([value]) => setEditingWatermark({
                    ...editingWatermark,
                    opacity: value
                  })}
                  min={0.1}
                  max={1}
                  step={0.01}
                />
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="aspect-video bg-muted rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      Sample Photo
                    </div>
                  </div>

                  <div
                    className={`absolute ${getPositionClasses(editingWatermark.position)}`}
                    style={{
                      opacity: editingWatermark.opacity,
                      transform: `scale(${editingWatermark.scale})`,
                    }}
                  >
                    <img
                      src={editingWatermark.fileUrl}
                      alt={editingWatermark.name}
                      className="max-w-none"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingWatermark(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateWatermark(editingWatermark)}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function getPositionClasses(position: string): string {
  switch (position) {
    case 'top_left':
      return 'top-2 left-2'
    case 'top_right':
      return 'top-2 right-2'
    case 'bottom_left':
      return 'bottom-2 left-2'
    case 'bottom_right':
      return 'bottom-2 right-2'
    case 'center':
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    default:
      return 'bottom-2 right-2'
  }
}
