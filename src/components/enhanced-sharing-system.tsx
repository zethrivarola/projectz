"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Share2,
  Link,
  Mail,
  Copy,
  Download,
  Eye,
  Lock,
  Globe,
  Users,
  Calendar,
  Settings,
  QrCode,
  Shield,
  Key,
  Clock,
  Check,
  X,
  ExternalLink,
  Heart,
  MessageSquare
} from "lucide-react"

interface Collection {
  id: string
  title: string
  slug: string
  photoCount: number
  coverPhoto?: {
    thumbnailUrl: string
    webUrl: string
  }
}

interface ShareLink {
  id: string
  token: string
  collectionId: string
  title: string
  description?: string
  isActive: boolean
  isPasswordProtected: boolean
  password?: string
  allowDownload: boolean
  allowComments: boolean
  allowFavorites: boolean
  expiresAt?: Date
  maxViews?: number
  currentViews: number
  uniqueVisitors: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
  recipientEmails: string[]
  customMessage?: string
  trackingEnabled: boolean
  requirePin: boolean
  downloadPin?: string
}

interface ShareActivity {
  id: string
  shareId: string
  action: 'viewed' | 'downloaded' | 'favorited' | 'commented'
  userAgent: string
  ipAddress: string
  timestamp: Date
  details?: Record<string, unknown>
}

interface EnhancedSharingSystemProps {
  collection: Collection
  isOpen: boolean
  onClose: () => void
  userRole: 'photographer' | 'admin' | 'client'
}

export function EnhancedSharingSystem({
  collection,
  isOpen,
  onClose,
  userRole
}: EnhancedSharingSystemProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [activities, setActivities] = useState<ShareActivity[]>([])
  const [newShare, setNewShare] = useState({
    title: `${collection.title} - Photo Gallery`,
    description: '',
    isPasswordProtected: false,
    password: '',
    allowDownload: true,
    allowComments: true,
    allowFavorites: true,
    expiresAt: '',
    maxViews: '',
    recipientEmails: '',
    customMessage: '',
    trackingEnabled: true,
    requirePin: false,
    downloadPin: ''
  })
  const [showCreateShare, setShowCreateShare] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Mock data for demo
  useEffect(() => {
    const mockShares: ShareLink[] = [
      {
        id: 'share-1',
        token: 'abc123def456',
        collectionId: collection.id,
        title: `${collection.title} - Client Gallery`,
        description: 'Wedding photos for review and selection',
        isActive: true,
        isPasswordProtected: true,
        password: 'wedding2024',
        allowDownload: true,
        allowComments: true,
        allowFavorites: true,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        maxViews: 100,
        currentViews: 45,
        uniqueVisitors: 12,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(),
        createdBy: 'photographer@demo.com',
        recipientEmails: ['client@demo.com', 'family@example.com'],
        customMessage: 'Please review these photos and select your favorites!',
        trackingEnabled: true,
        requirePin: true,
        downloadPin: '1234'
      }
    ]
    setShareLinks(mockShares)

    const mockActivities: ShareActivity[] = [
      {
        id: 'activity-1',
        shareId: 'share-1',
        action: 'viewed',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        details: { page: 'gallery' }
      },
      {
        id: 'activity-2',
        shareId: 'share-1',
        action: 'favorited',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        details: { photoId: 'photo-1' }
      },
      {
        id: 'activity-3',
        shareId: 'share-1',
        action: 'downloaded',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        details: { photoId: 'photo-2', pinUsed: true }
      }
    ]
    setActivities(mockActivities)
  }, [collection])

  const generateShareToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const createShare = () => {
    const newShareLink: ShareLink = {
      id: `share-${Date.now()}`,
      token: generateShareToken(),
      collectionId: collection.id,
      title: newShare.title,
      description: newShare.description,
      isActive: true,
      isPasswordProtected: newShare.isPasswordProtected,
      password: newShare.password,
      allowDownload: newShare.allowDownload,
      allowComments: newShare.allowComments,
      allowFavorites: newShare.allowFavorites,
      expiresAt: newShare.expiresAt ? new Date(newShare.expiresAt) : undefined,
      maxViews: newShare.maxViews ? parseInt(newShare.maxViews) : undefined,
      currentViews: 0,
      uniqueVisitors: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'photographer@demo.com',
      recipientEmails: newShare.recipientEmails.split(',').map(e => e.trim()).filter(e => e),
      customMessage: newShare.customMessage,
      trackingEnabled: newShare.trackingEnabled,
      requirePin: newShare.requirePin,
      downloadPin: newShare.requirePin ? generatePin() : undefined
    }

    setShareLinks(prev => [newShareLink, ...prev])
    setShowCreateShare(false)

    // Reset form
    setNewShare({
      title: `${collection.title} - Photo Gallery`,
      description: '',
      isPasswordProtected: false,
      password: '',
      allowDownload: true,
      allowComments: true,
      allowFavorites: true,
      expiresAt: '',
      maxViews: '',
      recipientEmails: '',
      customMessage: '',
      trackingEnabled: true,
      requirePin: false,
      downloadPin: ''
    })
  }

  const toggleShareStatus = (shareId: string) => {
    setShareLinks(prev => prev.map(share =>
      share.id === shareId
        ? { ...share, isActive: !share.isActive, updatedAt: new Date() }
        : share
    ))
  }

  const copyShareLink = async (share: ShareLink) => {
    const shareUrl = `${window.location.origin}/gallery/${share.token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(share.id)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const sendEmailInvite = async (share: ShareLink) => {
    // Mock email sending
    console.log('Sending email invite for share:', share.id)
    alert('Email invitations sent successfully!')
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (action: ShareActivity['action']) => {
    switch (action) {
      case 'viewed': return <Eye className="h-4 w-4" />
      case 'downloaded': return <Download className="h-4 w-4" />
      case 'favorited': return <Heart className="h-4 w-4" />
      case 'commented': return <MessageSquare className="h-4 w-4" />
      default: return <Eye className="h-4 w-4" />
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Enhanced Sharing
            <Badge variant="secondary">{shareLinks.length} active shares</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="shares" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shares">Share Links</TabsTrigger>
            <TabsTrigger value="create">Create Share</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="shares" className="space-y-4 m-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Active Share Links</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage existing share links and their permissions.
                  </p>
                </div>
                <Button onClick={() => setShowCreateShare(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Create New Share
                </Button>
              </div>

              {shareLinks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Share Links Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create secure share links to give clients access to their photos.
                    </p>
                    <Button onClick={() => setShowCreateShare(true)}>
                      Create First Share
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {shareLinks.map((share) => (
                    <Card key={share.id} className={!share.isActive ? 'opacity-60' : ''}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${share.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <div>
                              <h4 className="font-medium">{share.title}</h4>
                              <p className="text-sm text-muted-foreground">{share.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={share.isActive}
                              onCheckedChange={() => toggleShareStatus(share.id)}
                            />
                            <Badge variant={share.isActive ? 'default' : 'secondary'}>
                              {share.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">SECURITY</Label>
                            <div className="flex flex-wrap gap-1">
                              {share.isPasswordProtected && (
                                <Badge variant="outline" className="text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Password
                                </Badge>
                              )}
                              {share.requirePin && (
                                <Badge variant="outline" className="text-xs">
                                  <Key className="h-3 w-3 mr-1" />
                                  PIN: {share.downloadPin}
                                </Badge>
                              )}
                              {share.expiresAt && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Expires {formatDate(share.expiresAt)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium">PERMISSIONS</Label>
                            <div className="flex flex-wrap gap-1">
                              {share.allowDownload && (
                                <Badge variant="outline" className="text-xs">
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Badge>
                              )}
                              {share.allowComments && (
                                <Badge variant="outline" className="text-xs">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Comments
                                </Badge>
                              )}
                              {share.allowFavorites && (
                                <Badge variant="outline" className="text-xs">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Favorites
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-medium">STATISTICS</Label>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Views:</span>
                                <span>{share.currentViews}/{share.maxViews || '∞'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Visitors:</span>
                                <span>{share.uniqueVisitors}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Created {formatDate(share.createdAt)}</span>
                            {share.recipientEmails.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{share.recipientEmails.length} recipients</span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyShareLink(share)}
                              className="gap-2"
                            >
                              {copiedLink === share.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              {copiedLink === share.id ? 'Copied!' : 'Copy Link'}
                            </Button>
                            {share.recipientEmails.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => sendEmailInvite(share)}
                                className="gap-2"
                              >
                                <Mail className="h-4 w-4" />
                                Send Email
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Preview
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="create" className="space-y-6 m-0">
              <div>
                <h3 className="text-lg font-medium">Create New Share Link</h3>
                <p className="text-sm text-muted-foreground">
                  Configure permissions and security settings for the new share link.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Share Title</Label>
                      <Input
                        id="title"
                        value={newShare.title}
                        onChange={(e) => setNewShare(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Gallery title for recipients"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newShare.description}
                        onChange={(e) => setNewShare(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the gallery"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emails">Recipient Emails (comma-separated)</Label>
                      <Textarea
                        id="emails"
                        value={newShare.recipientEmails}
                        onChange={(e) => setNewShare(prev => ({ ...prev, recipientEmails: e.target.value }))}
                        placeholder="client@example.com, family@example.com"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Custom Message</Label>
                      <Textarea
                        id="message"
                        value={newShare.customMessage}
                        onChange={(e) => setNewShare(prev => ({ ...prev, customMessage: e.target.value }))}
                        placeholder="Personal message to include in the invitation"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Security & Permissions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Security & Permissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-protected">Password Protection</Label>
                      <Switch
                        id="password-protected"
                        checked={newShare.isPasswordProtected}
                        onCheckedChange={(checked: boolean) => setNewShare(prev => ({ ...prev, isPasswordProtected: checked }))}
                      />
                    </div>
                    {newShare.isPasswordProtected && (
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newShare.password}
                          onChange={(e) => setNewShare(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter gallery password"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label htmlFor="require-pin">Require PIN for Downloads</Label>
                      <Switch
                        id="require-pin"
                        checked={newShare.requirePin}
                        onCheckedChange={(checked: boolean) => setNewShare(prev => ({ ...prev, requirePin: checked }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="allow-download" className="text-sm">Allow Downloads</Label>
                          <Switch
                            id="allow-download"
                            checked={newShare.allowDownload}
                            onCheckedChange={(checked: boolean) => setNewShare(prev => ({ ...prev, allowDownload: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="allow-comments" className="text-sm">Allow Comments</Label>
                          <Switch
                            id="allow-comments"
                            checked={newShare.allowComments}
                            onCheckedChange={(checked: boolean) => setNewShare(prev => ({ ...prev, allowComments: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="allow-favorites" className="text-sm">Allow Favorites</Label>
                          <Switch
                            id="allow-favorites"
                            checked={newShare.allowFavorites}
                            onCheckedChange={(checked: boolean) => setNewShare(prev => ({ ...prev, allowFavorites: checked }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expires-at">Expiration Date</Label>
                        <Input
                          id="expires-at"
                          type="datetime-local"
                          value={newShare.expiresAt}
                          onChange={(e) => setNewShare(prev => ({ ...prev, expiresAt: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-views">Max Views (optional)</Label>
                        <Input
                          id="max-views"
                          type="number"
                          value={newShare.maxViews}
                          onChange={(e) => setNewShare(prev => ({ ...prev, maxViews: e.target.value }))}
                          placeholder="Unlimited"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateShare(false)}>
                  Cancel
                </Button>
                <Button onClick={createShare} disabled={!newShare.title.trim()}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 m-0">
              <div>
                <h3 className="text-lg font-medium">Share Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor how your shared galleries are being used.
                </p>
              </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{shareLinks.reduce((sum, share) => sum + share.currentViews, 0)}</div>
                    <div className="text-sm text-muted-foreground">Total Views</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{shareLinks.reduce((sum, share) => sum + share.uniqueVisitors, 0)}</div>
                    <div className="text-sm text-muted-foreground">Unique Visitors</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{activities.filter(a => a.action === 'downloaded').length}</div>
                    <div className="text-sm text-muted-foreground">Downloads</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{activities.filter(a => a.action === 'favorited').length}</div>
                    <div className="text-sm text-muted-foreground">Favorites</div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activities.slice(0, 10).map((activity) => {
                      const share = shareLinks.find(s => s.id === activity.shareId)
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-2 border rounded">
                          {getActivityIcon(activity.action)}
                          <div className="flex-1">
                            <div className="text-sm">
                              <span className="font-medium capitalize">{activity.action}</span>
                              {activity.details && typeof activity.details === 'object' && 'photoId' in activity.details && (
  <span className="text-muted-foreground"> • Photo {(activity.details as { photoId: string }).photoId}</span>
)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {share?.title} • {formatDate(activity.timestamp)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.ipAddress}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 m-0">
              <div>
                <h3 className="text-lg font-medium">Sharing Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Configure default sharing preferences and security policies.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Default Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Require password by default</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Enable tracking by default</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow downloads by default</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow comments by default</Label>
                    <Switch defaultChecked />
                  </div>
                  <div>
                    <Label>Default expiration (days)</Label>
                    <Input type="number" placeholder="30" className="mt-1" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Security Policies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Maximum concurrent shares per collection</Label>
                    <Input type="number" placeholder="10" className="mt-1" />
                  </div>
                  <div>
                    <Label>Maximum share duration (days)</Label>
                    <Input type="number" placeholder="90" className="mt-1" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Require email verification for new shares</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Log all share activities</Label>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
