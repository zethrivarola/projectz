"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShareCollectionDialog } from "@/components/share-collection-dialog"
import { Input } from "@/components/ui/input"
import { Share2, ExternalLink, Copy, Check } from "lucide-react"

const testCollection = {
  id: "test-collection-id",
  title: "Sample Wedding Photos",
  slug: "sample-wedding-photos",
  photoCount: 45,
}

const sampleShareLinks = [
  {
    type: "Public Link",
    url: `/gallery/abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdefg`,
    description: "Anyone with this link can view the photos"
  },
  {
    type: "Password Protected",
    url: `/gallery/xyz789uvw456rst123opq890nml567kji345gfe210dcb987azyxw765utsr432`,
    description: "Requires password: 'wedding2025'"
  }
]

export default function TestSharePage() {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const copyToClipboard = async (url: string) => {
    try {
      const fullUrl = `${window.location.origin}${url}`
      await navigator.clipboard.writeText(fullUrl)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Collection Sharing Test Page</h1>
          <p className="text-muted-foreground">
            Test the collection sharing functionality with the sample collection below
          </p>
        </div>

        {/* Test Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <h2 className="text-xl">{testCollection.title}</h2>
                <p className="text-sm text-muted-foreground font-normal">
                  {testCollection.photoCount} photos
                </p>
              </div>
              <Button
                onClick={() => setShowShareDialog(true)}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share Collection
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted rounded-lg overflow-hidden">
                  <img
                    src={`https://picsum.photos/300/400?random=${i + 20}`}
                    alt={`Sample photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sample Share Links */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Share Links</CardTitle>
            <p className="text-sm text-muted-foreground">
              Try these sample gallery links to see the client-facing view
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sampleShareLinks.map((link, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{link.type}</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(link.url)}
                    >
                      {copiedUrl === link.url ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{link.description}</p>
                <Input
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}${link.url}`}
                  readOnly
                  className="font-mono text-xs"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Share Dialog</h4>
              <p className="text-sm text-muted-foreground">
                Click "Share Collection" above to open the sharing dialog. You can:
              </p>
              <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                <li>• Choose between public or password-protected access</li>
                <li>• Set an expiry date for the share link</li>
                <li>• Send email invitations to clients</li>
                <li>• Copy the share link to clipboard</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Client Gallery View</h4>
              <p className="text-sm text-muted-foreground">
                Use the sample links above to see how clients will view shared collections:
              </p>
              <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                <li>• <strong>Public Link:</strong> Direct access to the gallery</li>
                <li>• <strong>Password Protected:</strong> Requires password "wedding2025"</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Features Available</h4>
              <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                <li>• ✅ Share link generation with access tokens</li>
                <li>• ✅ Password protection with secure hashing</li>
                <li>• ✅ Email sharing with custom messages</li>
                <li>• ✅ Client-facing gallery interface</li>
                <li>• ✅ Share link management (regenerate, delete)</li>
                <li>• ✅ Access analytics and activity tracking</li>
                <li>• 🔄 Download functionality (coming next)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <ShareCollectionDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          collection={testCollection}
        />
      </div>
    </div>
  )
}
