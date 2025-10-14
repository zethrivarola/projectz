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
    <div className="flex h-full w-screen h-screen">
      <div className="flex h-full flex-col lg:flex-row">
  <div className="w-96 border-r border-border bg-background overflow-y-auto hidden lg:block">
          <div className="p-6 border-b border-border">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold">{collection.title}</h1>
              <Badge variant={autoSave ? "default" : "secondary"}>
                {autoSave ? "Auto-save" : "Manual"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Professional Design System</p>
            
            <div className="flex items-center justify-between mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Auto-save</span>
              </div>
              <Switch checked={autoSave} onCheckedChange={setAutoSave} />
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="cover" className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="cover">Cover</TabsTrigger>
                <TabsTrigger value="typography">Type</TabsTrigger>
                <TabsTrigger value="color">Colors</TabsTrigger>
                <TabsTrigger value="grid">Layout</TabsTrigger>
              </TabsList>

              <TabsContent value="cover" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cover Layout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
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
                  </CardContent>
                </Card>

                {collection.coverPhoto && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cover Focus</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="typography" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Typography</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          className="w-12 h-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={titleColor}
                          onChange={(e) => setTitleColor(e.target.value)}
                          className="flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="color" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Color Presets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Custom Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">Background Color</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-12 h-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="flex-1"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Accent Color</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-12 h-12 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="flex-1"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="grid" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Grid Layout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm">Gallery Style</Label>
                      <Select value={photoGridStyle} onValueChange={setPhotoGridStyle}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="masonry">Masonry</SelectItem>
                          <SelectItem value="justified">Justified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="border-t border-border pt-6 mt-6 space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => saveDesign(false)} disabled={saving} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Design'}
                </Button>
                <Button variant="outline" onClick={resetToDefaults} size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`/admin/collections/${collection.slug}/preview`, '_blank')}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>

                <Button
                  variant="outline"
                  onClick={copyShareUrl}
                  className="flex-1"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Share2 className="h-4 w-4 mr-2" />
                  )}
                  {copied ? 'Copied!' : 'Share'}
                </Button>
              </div>

              {shareUrl && (
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs font-medium">Share URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyShareUrl}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-muted/50 overflow-auto p-8">
  <div className="w-full max-w-4xl mx-auto">
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div
  className="relative w-full overflow-hidden"
  style={{ 
  backgroundColor,
  aspectRatio: '16 / 9',
  maxHeight: '50vh',
  overflow: 'hidden'
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
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No cover photo selected
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40"></div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <h1
                      className="font-bold tracking-wide"
                      style={{
                        fontFamily: titleFont,
                        fontSize: `${titleSize}px`,
                        color: titleColor
                      }}
                    >
                      {collection.title.toUpperCase()}
                    </h1>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                      >
                        VIEW GALLERY
                      </Button>
                    </div>
                    <div className="mt-8">
                      <p className="text-white/80 text-xs tracking-wider">
                        RENÉ RIVAROLA PHOTOGRAPHY
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8" style={{ backgroundColor }}>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
                    gap: `${gridSpacing * 0.5}px`
                  }}
                >
                  {photos.slice(0, gridColumns * 2).map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-muted rounded overflow-hidden"
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalFilename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, (gridColumns * 2) - photos.length) }).map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="aspect-square bg-muted/50 rounded flex items-center justify-center"
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
   </div>
  )
}