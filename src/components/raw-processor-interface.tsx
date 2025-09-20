"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Settings,
  Download,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Sun,
  Contrast,
  Palette,
  Zap,
  Focus,
  Volume,
  Image as ImageIcon
} from "lucide-react"

interface RawProcessingSettings {
  exposure: number
  shadows: number
  highlights: number
  contrast: number
  vibrance: number
  saturation: number
  temperature: number
  tint: number
  clarity: number
  sharpening: number
  noiseReduction: number
}

interface RawPhoto {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  originalUrl: string
  isRaw: boolean
  rawFormat?: string
  exifData?: {
    make?: string
    model?: string
    iso?: number
    fNumber?: number
    [key: string]: unknown
  }
}

interface RawProcessorInterfaceProps {
  photo: RawPhoto
  onProcessingComplete?: (processedUrl: string) => void
}

export function RawProcessorInterface({ photo, onProcessingComplete }: RawProcessorInterfaceProps) {
  const [settings, setSettings] = useState<RawProcessingSettings>({
    exposure: 0,
    shadows: 0,
    highlights: 0,
    contrast: 0,
    vibrance: 0,
    saturation: 0,
    temperature: 5500,
    tint: 0,
    clarity: 0,
    sharpening: 25,
    noiseReduction: 25,
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('processed')
  const [autoProcess, setAutoProcess] = useState(false)
  const [lastProcessTime, setLastProcessTime] = useState<number>(0)

const processRaw = useCallback(async () => {
    setIsProcessing(true)
    const startTime = Date.now()

    try {
      const response = await fetch(`/api/photos/${photo.id}/process-raw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) {
        throw new Error('RAW processing failed')
      }

      const result = await response.json()
      setProcessedUrl(result.processedUrl)
      setLastProcessTime(Date.now())
      onProcessingComplete?.(result.processedUrl)

      // Show processing time feedback
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`RAW processing completed in ${processingTime}s`)

    } catch (error) {
      console.error('RAW processing error:', error)
      if (!autoProcess) {
        alert('RAW processing failed. Please try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }, [photo, settings, setIsProcessing, setProcessedUrl, setLastProcessTime, onProcessingComplete, autoProcess]);

  useEffect(() => {
    // Check if any settings have changed from defaults
    const defaultSettings = {
      exposure: 0, shadows: 0, highlights: 0, contrast: 0,
      vibrance: 0, saturation: 0, temperature: 5500, tint: 0,
      clarity: 0, sharpening: 25, noiseReduction: 25,
    }

    const changed = Object.keys(settings).some(
      key => settings[key as keyof RawProcessingSettings] !== defaultSettings[key as keyof RawProcessingSettings]
    )
    setHasChanges(changed)

    // Auto-process if enabled and settings changed
    if (autoProcess && changed && Date.now() - lastProcessTime > 1000) {
      const timeoutId = setTimeout(() => {
        processRaw()
      }, 500) // Debounce processing calls

      return () => clearTimeout(timeoutId)
    }
  }, [settings, autoProcess, lastProcessTime, processRaw])

  const updateSetting = (key: keyof RawProcessingSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const resetSettings = () => {
    setSettings({
      exposure: 0, shadows: 0, highlights: 0, contrast: 0,
      vibrance: 0, saturation: 0, temperature: 5500, tint: 0,
      clarity: 0, sharpening: 25, noiseReduction: 25,
    })
    setProcessedUrl(null)
  }

  const applyPreset = (presetName: string) => {
    const presets: Record<string, RawProcessingSettings> = {
      portrait: {
        exposure: 0.2,
        shadows: 15,
        highlights: -10,
        contrast: 10,
        vibrance: 15,
        saturation: 0,
        temperature: 5600,
        tint: 5,
        clarity: 20,
        sharpening: 40,
        noiseReduction: 20,
      },
      landscape: {
        exposure: 0,
        shadows: 25,
        highlights: -20,
        contrast: 25,
        vibrance: 30,
        saturation: 10,
        temperature: 5400,
        tint: -5,
        clarity: 35,
        sharpening: 50,
        noiseReduction: 15,
      },
      dramatic: {
        exposure: -0.3,
        shadows: 40,
        highlights: -30,
        contrast: 40,
        vibrance: 25,
        saturation: 20,
        temperature: 5200,
        tint: 0,
        clarity: 50,
        sharpening: 30,
        noiseReduction: 25,
      },
      soft: {
        exposure: 0.3,
        shadows: 10,
        highlights: -5,
        contrast: -15,
        vibrance: 10,
        saturation: -5,
        temperature: 5700,
        tint: 10,
        clarity: -20,
        sharpening: 15,
        noiseReduction: 40,
      },
      vivid: {
        exposure: 0.1,
        shadows: 20,
        highlights: -15,
        contrast: 30,
        vibrance: 50,
        saturation: 25,
        temperature: 5500,
        tint: 0,
        clarity: 30,
        sharpening: 45,
        noiseReduction: 20,
      }
    }

    const preset = presets[presetName]
    if (preset) {
      setSettings(preset)
    }
  }

  

  const downloadProcessed = async () => {
    if (!processedUrl) return

    try {
      const response = await fetch(processedUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${photo.originalFilename.replace(/\.[^/.]+$/, '')}_processed.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

 const SliderControl = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  icon: Icon
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  icon: React.ComponentType<{ className?: string }>
}) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        <span className="text-sm text-muted-foreground min-w-[60px] text-right">
          {value}{unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  )

  return (
    <div className="grid lg:grid-cols-2 gap-6 h-full">
      {/* Preview Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                RAW Preview
                <Badge variant="secondary" className="ml-2">
                  {photo.rawFormat?.toUpperCase()}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden relative">
              {showPreview && (
                <img
                  src={previewMode === 'processed' ? (processedUrl || photo.webUrl) : photo.webUrl}
                  alt={photo.originalFilename}
                  className="w-full h-full object-contain"
                />
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Processing RAW...</p>
                  </div>
                </div>
              )}

              {/* Settings indicator */}
              {hasChanges && (
                <div className="absolute top-2 right-2">
                  <Badge variant="default">
                    Settings Applied
                  </Badge>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="mt-4 text-sm text-muted-foreground">
              <div className="grid grid-cols-2 gap-2">
                <div>File: {photo.originalFilename}</div>
                {photo.exifData?.make && (
                  <div>Camera: {photo.exifData.make} {photo.exifData.model}</div>
                )}
                {photo.exifData?.iso && (
                  <div>ISO: {photo.exifData.iso}</div>
                )}
                {photo.exifData?.fNumber && (
                  <div>Aperture: f/{photo.exifData.fNumber}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Controls */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={previewMode === 'original' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('original')}
          >
            Original
          </Button>
          <Button
            variant={previewMode === 'processed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPreviewMode('processed')}
          >
            Processed
          </Button>
          <div className="flex-1" />
          <Button
            variant={autoProcess ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoProcess(!autoProcess)}
          >
            Auto Preview
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={processRaw}
            disabled={isProcessing || (!hasChanges && !autoProcess)}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                {autoProcess ? 'Reprocess' : 'Process RAW'}
              </>
            )}
          </Button>

          {processedUrl && (
            <Button
              variant="outline"
              onClick={downloadProcessed}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}

          <Button
            variant="outline"
            onClick={resetSettings}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              RAW Processing Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Processing Presets */}
            <div className="mb-6">
              <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'portrait', label: 'Portrait', icon: '👤' },
                  { name: 'landscape', label: 'Landscape', icon: '🏔️' },
                  { name: 'dramatic', label: 'Dramatic', icon: '⚡' },
                  { name: 'soft', label: 'Soft', icon: '☁️' },
                  { name: 'vivid', label: 'Vivid', icon: '🌈' },
                  { name: 'reset', label: 'Reset', icon: '🔄' },
                ].map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => preset.name === 'reset' ? resetSettings() : applyPreset(preset.name)}
                    className="h-12 flex flex-col gap-1"
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <span className="text-xs">{preset.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="color">Color</TabsTrigger>
                <TabsTrigger value="detail">Detail</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6 mt-6">
                <SliderControl
                  label="Exposure"
                  value={settings.exposure}
                  onChange={(value) => updateSetting('exposure', value)}
                  min={-2}
                  max={2}
                  step={0.1}
                  unit=" EV"
                  icon={Sun}
                />

                <SliderControl
                  label="Shadows"
                  value={settings.shadows}
                  onChange={(value) => updateSetting('shadows', value)}
                  min={0}
                  max={100}
                  icon={ImageIcon}
                />

                <SliderControl
                  label="Highlights"
                  value={settings.highlights}
                  onChange={(value) => updateSetting('highlights', value)}
                  min={0}
                  max={100}
                  icon={ImageIcon}
                />

                <SliderControl
                  label="Contrast"
                  value={settings.contrast}
                  onChange={(value) => updateSetting('contrast', value)}
                  min={-100}
                  max={100}
                  icon={Contrast}
                />
              </TabsContent>

              <TabsContent value="color" className="space-y-6 mt-6">
                <SliderControl
                  label="Temperature"
                  value={settings.temperature}
                  onChange={(value) => updateSetting('temperature', value)}
                  min={2000}
                  max={10000}
                  step={50}
                  unit="K"
                  icon={Sun}
                />

                <SliderControl
                  label="Tint"
                  value={settings.tint}
                  onChange={(value) => updateSetting('tint', value)}
                  min={-100}
                  max={100}
                  icon={Palette}
                />

                <SliderControl
                  label="Vibrance"
                  value={settings.vibrance}
                  onChange={(value) => updateSetting('vibrance', value)}
                  min={-100}
                  max={100}
                  icon={Zap}
                />

                <SliderControl
                  label="Saturation"
                  value={settings.saturation}
                  onChange={(value) => updateSetting('saturation', value)}
                  min={-100}
                  max={100}
                  icon={Palette}
                />
              </TabsContent>

              <TabsContent value="detail" className="space-y-6 mt-6">
                <SliderControl
                  label="Clarity"
                  value={settings.clarity}
                  onChange={(value) => updateSetting('clarity', value)}
                  min={-100}
                  max={100}
                  icon={Focus}
                />

                <SliderControl
                  label="Sharpening"
                  value={settings.sharpening}
                  onChange={(value) => updateSetting('sharpening', value)}
                  min={0}
                  max={100}
                  icon={Focus}
                />

                <SliderControl
                  label="Noise Reduction"
                  value={settings.noiseReduction}
                  onChange={(value) => updateSetting('noiseReduction', value)}
                  min={0}
                  max={100}
                  icon={Volume}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
