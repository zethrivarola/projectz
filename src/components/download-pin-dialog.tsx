"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Download,
  Shield,
  Clock,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon
} from "lucide-react"

const DownloadRequestSchema = z.object({
  clientEmail: z.string().email().optional().or(z.literal('')),
  resolution: z.enum(['web', 'high_res', 'original']),
})

type DownloadRequestData = {
  clientEmail?: string
  resolution: 'web' | 'high_res' | 'original'
}

interface DownloadPinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  photo?: {
    id: string
    filename: string
    originalFilename: string
    thumbnailUrl: string
  }
  collection?: {
    id: string
    title: string
  }
  accessToken: string
}

interface PinInfo {
  pin: string
  expiresAt: string
  downloadUrl?: string
}

export function DownloadPinDialog({
  open,
  onOpenChange,
  photo,
  collection,
  accessToken
}: DownloadPinDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pinInfo, setPinInfo] = useState<PinInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<'request' | 'pin_generated' | 'verify_pin'>('request')
  const [verificationPin, setVerificationPin] = useState('')
  const [verifyingPin, setVerifyingPin] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DownloadRequestData>({
    defaultValues: {
      clientEmail: '',
      resolution: 'high_res',
    }
  })

  const resolution = watch('resolution')

  const onSubmit = async (data: DownloadRequestData) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/gallery/${accessToken}/download/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId: photo?.id,
          collectionId: collection?.id,
          clientEmail: data.clientEmail || null,
          resolution: data.resolution,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate download PIN')
      }

      const result = await response.json()
      setPinInfo({
        pin: result.pin,
        expiresAt: result.expiresAt,
      })
      setStep('pin_generated')

    } catch (error) {
      console.error('Error generating PIN:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyPin = async () => {
    if (!verificationPin || verificationPin.length !== 4) return

    setVerifyingPin(true)

    try {
      const response = await fetch(`/api/gallery/${accessToken}/download/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pin: verificationPin,
        }),
      })

      if (!response.ok) {
        throw new Error('Invalid PIN')
      }

      const result = await response.json()

      // Trigger download
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = photo?.originalFilename || 'photo.jpg'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onOpenChange(false)

    } catch (error) {
      console.error('PIN verification error:', error)
      alert('Invalid PIN. Please try again.')
    } finally {
      setVerifyingPin(false)
    }
  }

  const copyPin = async () => {
    if (pinInfo?.pin) {
      try {
        await navigator.clipboard.writeText(pinInfo.pin)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy PIN:', error)
      }
    }
  }

  const getResolutionInfo = (res: string) => {
    switch (res) {
      case 'web':
        return { label: 'Web Quality', description: '1200px max, optimized for web (2-5MB)' }
      case 'high_res':
        return { label: 'High Resolution', description: '2400px max, print quality (5-15MB)' }
      case 'original':
        return { label: 'Original Quality', description: 'Full resolution, uncompressed (10-50MB)' }
      default:
        return { label: 'High Resolution', description: '2400px max, print quality' }
    }
  }

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    const diffMins = Math.ceil(diffMs / (1000 * 60))

    if (diffMins <= 0) return 'Expired'
    if (diffMins < 60) return `${diffMins} minutes`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {step === 'request' && 'Request Download'}
            {step === 'pin_generated' && 'Download PIN Generated'}
            {step === 'verify_pin' && 'Enter Download PIN'}
          </DialogTitle>
        </DialogHeader>

        {step === 'request' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Photo Preview */}
            {photo && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalFilename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{photo.originalFilename}</h4>
                      <p className="text-xs text-muted-foreground">
                        From "{collection?.title}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Collection Download */}
            {!photo && collection && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Download All Photos</h4>
                      <p className="text-sm text-muted-foreground">
                        From "{collection.title}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resolution Selection */}
            <div className="space-y-3">
              <Label>Download Quality</Label>
              <div className="space-y-2">
                {(['web', 'high_res', 'original'] as const).map((res) => {
                  const info = getResolutionInfo(res)
                  return (
                    <Card
                      key={res}
                      className={`cursor-pointer transition-colors ${
                        resolution === res ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setValue('resolution', res)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            value={res}
                            {...register('resolution')}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{info.label}</h4>
                            <p className="text-xs text-muted-foreground">{info.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Email (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email (Optional)</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="your@email.com"
                {...register('clientEmail')}
              />
              <p className="text-xs text-muted-foreground">
                Receive the download PIN via email for convenience
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Generating...' : 'Generate Download PIN'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 'pin_generated' && pinInfo && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Download PIN Generated</h3>
              <p className="text-sm text-muted-foreground">
                Use this PIN to securely download your photo
              </p>
            </div>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold tracking-wider mb-2 font-mono">
                  {pinInfo.pin}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expires in {formatTimeLeft(pinInfo.expiresAt)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={copyPin}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy PIN
                  </>
                )}
              </Button>
              <Button
                onClick={() => setStep('verify_pin')}
                className="flex-1"
              >
                Enter PIN to Download
              </Button>
            </div>
          </div>
        )}

        {step === 'verify_pin' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Enter Download PIN</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 4-digit PIN to start your download
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <Input
                  type="text"
                  placeholder="0000"
                  value={verificationPin}
                  onChange={(e) => setVerificationPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="text-center text-2xl tracking-wider font-mono w-32"
                  maxLength={4}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('pin_generated')}
                  className="flex-1"
                >
                  Back to PIN
                </Button>
                <Button
                  onClick={verifyPin}
                  disabled={verificationPin.length !== 4 || verifyingPin}
                  className="flex-1"
                >
                  {verifyingPin ? 'Verifying...' : 'Download'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
