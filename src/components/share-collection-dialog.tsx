"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Share2,
  Lock,
  Globe,
  RefreshCw,
  Mail,
  Calendar
} from "lucide-react"

const ShareCollectionSchema = z.object({
  visibility: z.enum(['public', 'password_protected']),
  password: z.string().optional(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  expiresAt: z.string().optional(),
  message: z.string().optional(),
})

type ShareCollectionData = z.infer<typeof ShareCollectionSchema>

interface ShareCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection: {
    id: string
    title: string
    slug: string
    photoCount?: number
  }
}

interface ShareInfo {
  accessToken: string
  shareUrl: string
  expiresAt?: string
  createdAt: string
}

export function ShareCollectionDialog({
  open,
  onOpenChange,
  collection
}: ShareCollectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ShareCollectionData>({
    resolver: zodResolver(ShareCollectionSchema),
    defaultValues: {
      visibility: 'public',
      password: '',
      recipientEmail: '',
      message: '',
    }
  })

  const visibility = watch('visibility')

  // Load existing share info when dialog opens
  useEffect(() => {
    if (open && collection.id) {
      loadExistingShare()
    }
  }, [open, collection.id, loadExistingShare])

  const loadExistingShare = useCallback(async () => {
    try {
      const response = await fetch(`/api/collections/${collection.slug}/share`)
      if (response.ok) {
        const data = await response.json()
        if (data.share) {
          setShareInfo(data.share)
        }
      }
    } catch (error) {
      console.error('Error loading share info:', error)
    }
  }, [collection, setShareInfo]);

  const generateShareUrl = (accessToken: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/gallery/${accessToken}`
  }

  const onSubmit = async (data: ShareCollectionData) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/collections/${collection.slug}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const result = await response.json()
      setShareInfo({
        accessToken: result.accessToken,
        shareUrl: generateShareUrl(result.accessToken),
        expiresAt: result.expiresAt,
        createdAt: result.createdAt,
      })

    } catch (error) {
      console.error('Error creating share link:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateLink = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/collections/${collection.slug}/share`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShareInfo(null)
        // Trigger form submission to create new share
        handleSubmit(onSubmit)()
      }
    } catch (error) {
      console.error('Error regenerating link:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (shareInfo?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareInfo.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy:', error)
      }
    }
  }

  const sendEmail = async () => {
    const recipientEmail = watch('recipientEmail')
    const message = watch('message')

    if (!recipientEmail || !shareInfo) return

    setIsLoading(true)
    try {
      await fetch(`/api/collections/${collection.slug}/share/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail,
          message,
          shareUrl: shareInfo.shareUrl,
        }),
      })

      // Show success message
      console.log('Email sent successfully')
    } catch (error) {
      console.error('Error sending email:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Collection
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Share "{collection.title}" with clients
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Share Link */}
          {shareInfo && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Active Share Link</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerateLink}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={shareInfo.shareUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(shareInfo.createdAt).toLocaleDateString()}
                    {shareInfo.expiresAt && (
                      <span> • Expires: {new Date(shareInfo.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share Settings Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Visibility Settings */}
            <div className="space-y-3">
              <Label>Collection Visibility</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={`cursor-pointer transition-colors ${
                    visibility === 'public' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setValue('visibility', 'public')}
                >
                  <CardContent className="p-4 text-center">
                    <Globe className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-medium">Public</h4>
                    <p className="text-xs text-muted-foreground">Anyone with link can view</p>
                    <input
                      type="radio"
                      value="public"
                      {...register('visibility')}
                      className="sr-only"
                    />
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-colors ${
                    visibility === 'password_protected' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setValue('visibility', 'password_protected')}
                >
                  <CardContent className="p-4 text-center">
                    <Lock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-medium">Password Protected</h4>
                    <p className="text-xs text-muted-foreground">Requires password to view</p>
                    <input
                      type="radio"
                      value="password_protected"
                      {...register('visibility')}
                      className="sr-only"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Password Field */}
            {visibility === 'password_protected' && (
              <div className="space-y-2">
                <Label htmlFor="password">Collection Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password for collection access"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            )}

            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
              <div className="relative">
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  {...register('expiresAt')}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent access
              </p>
            </div>

            {/* Email Sharing */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Sharing (Optional)
              </h4>

              <div className="space-y-2">
                <Label htmlFor="recipientEmail">Recipient Email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="client@example.com"
                  {...register('recipientEmail')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Custom Message</Label>
                <Textarea
                  id="message"
                  placeholder="Hi! I'm excited to share your photos with you..."
                  rows={3}
                  {...register('message')}
                />
                <p className="text-xs text-muted-foreground">
                  Personal message to include in the email
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>

              {shareInfo && watch('recipientEmail') && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={sendEmail}
                  disabled={isLoading}
                >
                  Send Email
                </Button>
              )}

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : shareInfo ? 'Update Share' : 'Create Share Link'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
