"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Eye,
  Share2,
  Save,
  Check,
  Copy,
  RotateCcw,
  Zap,
  ImageIcon
} from "lucide-react"
import Masonry from 'react-masonry-css'
import { ChevronLeft, Monitor, Smartphone } from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  visibility: string
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

interface Photo {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  originalUrl: string
}

const COVER_LAYOUTS = [
  { id: 'center', name: 'Center', description: 'Title centered over image' },
  { id: 'left', name: 'Left', description: 'Title positioned on left side' },
  { id: 'novel', name: 'Novel', description: 'Book-style elegant layout' },
  { id: 'vintage', name: 'Vintage', description: 'Classic vintage styling' },
  { id: 'frame', name: 'Frame', description: 'Bordered frame design' },
  { id: 'stripe', name: 'Stripe', description: 'Modern stripe overlay' },
  { id: 'divider', name: 'Divider', description: 'Split design with divider' },
  { id: 'journal', name: 'Journal', description: 'Journal-style layout' }
]

const FONTS = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Lora', value: 'Lora' },
  { name: 'Oswald', value: 'Oswald' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Crimson Text', value: 'Crimson Text' },
  { name: 'Source Sans Pro', value: 'Source Sans Pro' }
]

const COLOR_PRESETS = [
  { name: 'Classic', background: '#ffffff', accent: '#000000' },
  { name: 'Warm', background: '#fef7f0', accent: '#8b4513' },
  { name: 'Cool', background: '#f0f9ff', accent: '#1e40af' },
  { name: 'Elegant', background: '#1a1a1a', accent: '#d4af37' },
  { name: 'Modern', background: '#f8fafc', accent: '#0f172a' },
  { name: 'Soft', background: '#fdf2f8', accent: '#be185d' }
]

export default function CollectionDesignPage() {
  const params = useParams()
  const slug = params.slug as string
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const [selectedLayout, setSelectedLayout] = useState('center')
  const [titleFont, setTitleFont] = useState('Playfair Display')
  const [titleSize, setTitleSize] = useState(48)
  const [titleColor, setTitleColor] = useState('#ffffff')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [accentColor, setAccentColor] = useState('#000000')
  const [gridColumns, setGridColumns] = useState(4)
  const [gridSpacing, setGridSpacing] = useState(12)
  const [photoGridStyle, setPhotoGridStyle] = useState('grid')
  const [focusX, setFocusX] = useState(50)
  const [focusY, setFocusY] = useState(50)
const [panelCollapsed, setPanelCollapsed] = useState(false)
const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth-token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }, [])

  const fetchCollection = useCallback(async () => {
    try {
      setLoading(true)
      
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      setAuthChecked(true)

      const response = await fetch(`/api/collections/${slug}`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collection')
      }

      const data = await response.json()
      setCollection(data.collection)
      setPhotos(data.photos || [])

      const col = data.collection
      if (col) {
        setSelectedLayout(col.design?.coverLayout || 'center')
        setPhotoGridStyle(col.gridStyle || 'grid')
        setTitleFont(col.design?.typography?.titleFont || 'Playfair Display')
        setTitleSize(col.design?.typography?.titleSize || 48)
        setTitleColor(col.design?.typography?.titleColor || '#ffffff')
        setBackgroundColor(col.design?.colors?.background || '#ffffff')
        setAccentColor(col.design?.colors?.accent || '#000000')
        setGridColumns(col.design?.grid?.columns || 4)
        setGridSpacing(col.design?.grid?.spacing || 12)
        setFocusX(col.design?.coverFocus?.x || 50)
        setFocusY(col.design?.coverFocus?.y || 50)
      }

    } catch (error) {
      console.error('Error fetching collection:', error)
    } finally {
      setLoading(false)
    }
  }, [slug, router, getAuthHeaders])

  useEffect(() => {
    if (params.slug) {
      fetchCollection()
    }
  }, [params.slug, fetchCollection])

  const saveDesign = useCallback(async (silent = false) => {
    try {
      setSaving(true)
      
      const designData = {
        gridStyle: photoGridStyle,
        gridColumns: gridColumns,
        thumbnailSize: 'regular',
        gridSpacing: gridSpacing.toString(),
        navigationStyle: 'icons',
        typographyStyle: titleFont,
        colorTheme: backgroundColor === '#ffffff' ? 'light' : 'dark',
        coverFocalPoint: {
          x: focusX,
          y: focusY
        },
        coverLayout: selectedLayout,
        titleSize: titleSize,
        titleColor: titleColor,
        customBackgroundColor: backgroundColor,
        customAccentColor: accentColor
      }
      
      const response = await fetch(`/api/collections/${slug}/design`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(designData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save design')
      }

      const data = await response.json()
      
      setCollection(prev => prev ? {
        ...prev,
        ...data.design
      } : null)

      if (!silent) {
        alert('Design saved successfully!')
      }
      
    } catch (error) {
      console.error('Save error:', error)
      if (!silent) {
        alert('Failed to save design')
      }
    } finally {
      setSaving(false)
    }
  }, [
    slug, 
    photoGridStyle, 
    gridColumns, 
    gridSpacing, 
    titleFont, 
    backgroundColor, 
    focusX, 
    focusY, 
    selectedLayout, 
    titleSize, 
    titleColor, 
    accentColor,
    getAuthHeaders
  ])

  useEffect(() => {
    if (autoSave && collection) {
      const timeoutId = setTimeout(() => {
        saveDesign(true)
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  }, [slug, photoGridStyle, selectedLayout, gridColumns, titleFont, titleSize, titleColor, backgroundColor, accentColor, gridSpacing, focusX, focusY, autoSave, collection, saveDesign])

  const generateShareUrl = async () => {
    if (!collection) return

    try {
      const response = await fetch(`/api/collections/${collection.slug}/share`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          title: collection.title,
          visibility: 'public'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const data = await response.json()
      const url = `${window.location.origin}/gallery/${data.shareLink.token}`
      setShareUrl(url)
      return url

    } catch (error) {
      console.error('Error generating share URL:', error)
      alert('Failed to generate share link')
    }
  }

  const copyShareUrl = async () => {
    let url = shareUrl
    if (!url) {
      const newUrl = await generateShareUrl()
      if (newUrl) {
        url = newUrl
      } else {
        return 
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setBackgroundColor(preset.background)
    setAccentColor(preset.accent)
  }

  const resetToDefaults = () => {
    setSelectedLayout('center')
    setTitleFont('Playfair Display')
    setTitleSize(48)
    setTitleColor('#ffffff')
    setBackgroundColor('#ffffff')
    setAccentColor('#000000')
    setGridColumns(4)
    setGridSpacing(12)
    setFocusX(50)
    setFocusY(50)
  }

  if (!authChecked && loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading collection design...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!collection) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Collection Not Found</h2>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

return (
  <div className="flex flex-col h-screen w-screen overflow-hidden">
    {/* Top Bar */}
    <div className="border-b bg-white px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {collection.title}
          </Button>
        </Link>
        <Badge variant={autoSave ? "default" : "secondary"} className="text-xs">
          {autoSave ? "Auto-save" : "Manual"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/admin/collections/${collection.slug}/preview`, '_blank')}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={copyShareUrl}
        >
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </div>
    </div>

    {/* Main Content */}
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div 
        className={`border-r bg-white transition-all duration-300 ${
          panelCollapsed ? 'w-0' : 'w-80'
        } overflow-hidden`}
      >
        <div className="h-full overflow-y-auto p-6">
          <Tabs defaultValue="cover" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="cover">Cover</TabsTrigger>
              <TabsTrigger value="typography">Type</TabsTrigger>
              <TabsTrigger value="color">Color</TabsTrigger>
              <TabsTrigger value="grid">Grid</TabsTrigger>
            </TabsList>

            <TabsContent value="cover" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Cover Layout</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {COVER_LAYOUTS.map((layout) => (
                    <Button
                      key={layout.id}
                      variant={selectedLayout === layout.id ? "default" : "outline"}
                      className="h-auto p-3 flex flex-col items-center text-xs"
                      onClick={() => setSelectedLayout(layout.id)}
                    >
                      <div className="w-8 h-6 bg-muted rounded mb-1"></div>
                      {layout.name}
                    </Button>
                  ))}
                </div>
              </div>

              {collection.coverPhoto && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm">Horizontal Position</Label>
                    <Slider
                      value={[focusX]}
                      onValueChange={(value) => setFocusX(value[0])}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{focusX}%</div>
                  </div>
                  <div>
                    <Label className="text-sm">Vertical Position</Label>
                    <Slider
                      value={[focusY]}
                      onValueChange={(value) => setFocusY(value[0])}
                      max={100}
                      step={1}
                      className="mt-2"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{focusY}%</div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="typography" className="space-y-4">
              <div>
                <Label className="text-sm">Font Family</Label>
                <Select value={titleFont} onValueChange={setTitleFont}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Title Size</Label>
                <Slider
                  value={[titleSize]}
                  onValueChange={(value) => setTitleSize(value[0])}
                  min={24}
                  max={96}
                  step={2}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">{titleSize}px</div>
              </div>

              <div>
                <Label className="text-sm">Title Color</Label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="w-12 h-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="color" className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Presets</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {COLOR_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      className="h-auto p-2 flex items-center gap-2 text-xs"
                      onClick={() => applyColorPreset(preset)}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: preset.accent }}
                      />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div>
                  <Label className="text-sm">Background</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Accent</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-12 rounded border cursor-pointer"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="grid" className="space-y-4">
              <div>
                <Label className="text-sm">Columns</Label>
                <Slider
                  value={[gridColumns]}
                  onValueChange={(value) => setGridColumns(value[0])}
                  min={2}
                  max={6}
                  step={1}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">{gridColumns} columns</div>
              </div>

              <div>
                <Label className="text-sm">Spacing</Label>
                <Slider
                  value={[gridSpacing]}
                  onValueChange={(value) => setGridSpacing(value[0])}
                  min={4}
                  max={32}
                  step={2}
                  className="mt-2"
                />
                <div className="text-xs text-muted-foreground mt-1">{gridSpacing}px</div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-4 mt-6 space-y-2">
            <Button onClick={() => saveDesign(false)} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Design'}
            </Button>
            <Button variant="outline" onClick={resetToDefaults} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-gray-50 overflow-auto relative">
        <div className={`h-full flex items-center justify-center p-8 ${
          previewMode === 'mobile' ? 'bg-gray-100' : ''
        }`}>
          <div 
            className={`bg-white shadow-2xl overflow-hidden transition-all ${
              previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-5xl'
            }`}
            style={{ 
              height: previewMode === 'mobile' ? '667px' : 'auto',
              maxHeight: previewMode === 'mobile' ? '667px' : '100%'
            }}
          >
            {/* Cover Preview */}
            <div
              className="relative w-full overflow-hidden"
              style={{
                backgroundColor,
                height: previewMode === 'mobile' ? '40vh' : '50vh'
              }}
            >
              {collection.coverPhoto ? (
                <img
                  src={collection.coverPhoto.webUrl}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    objectPosition: `${focusX}% ${focusY}%`
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <ImageIcon className="h-16 w-16" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40"></div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-4">
                  <h1
                    className="font-bold tracking-wide"
                    style={{
                      fontFamily: titleFont,
                      fontSize: previewMode === 'mobile' ? `${titleSize * 0.6}px` : `${titleSize}px`,
                      color: titleColor
                    }}
                  >
                    {collection.title.toUpperCase()}
                  </h1>
                </div>
              </div>
            </div>

            {/* Gallery Preview with Masonry */}
            <div className="p-4 overflow-auto" style={{ backgroundColor, maxHeight: previewMode === 'mobile' ? '27vh' : '40vh' }}>
              {photos.length > 0 ? (
                <Masonry
                  breakpointCols={previewMode === 'mobile' ? 2 : gridColumns}
                  className="flex w-full"
                  columnClassName="bg-clip-padding"
                  style={{ gap: `${gridSpacing}px` }}
                >
                  {photos.slice(0, 12).map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded"
                      style={{ marginBottom: `${gridSpacing}px` }}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalFilename}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ))}
                </Masonry>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">No photos in collection</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop/Mobile Toggle */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white border rounded-lg shadow-lg p-1 flex gap-1">
          <Button
            variant={previewMode === 'desktop' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('desktop')}
            className="gap-2"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={previewMode === 'mobile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode('mobile')}
            className="gap-2"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setPanelCollapsed(!panelCollapsed)}
        className="absolute left-0 bottom-4 bg-white border border-r-0 rounded-r-lg p-2 shadow-lg hover:bg-gray-50 transition-colors z-10"
        style={{ left: panelCollapsed ? '0' : '320px' }}
      >
        <ChevronLeft className={`h-4 w-4 transition-transform ${panelCollapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  </div>
)
}
