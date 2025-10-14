"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  Heart,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Users,
  Image,
  Filter,
  Download,
  Mail,
  Calendar
} from "lucide-react"

interface Photo {
  id: string
  filename: string
  originalFilename: string
  thumbnailUrl: string
  webUrl: string
  collectionId: string
}

interface Favorite {
  id: string
  photoId: string
  clientEmail: string
  notes?: string
  createdAt: string
  photo: Photo
  favoriteCount: number
}

interface Analytics {
  totalFavorites: number
  uniquePhotos: number
  uniqueClients: number
  collections: number
  byCollection: Array<{
    collectionId: string
    collectionTitle: string
    collectionSlug: string
    totalFavorites: number
    uniquePhotos: number
    uniqueClients: number
  }>
  mostFavoritedPhotos: Array<Favorite>
  clientActivity: Array<{
    clientEmail: string
    totalFavorites: number
    collections: number
    lastFavoritedAt: string | null
  }>
}

export default function ClientsFavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [authChecked, setAuthChecked] = useState(false)
  const [filterEmail, setFilterEmail] = useState("")
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent")

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth-token')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true)
      setError("")

      // Check authentication
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (!authResponse.ok) {
        router.push('/login')
        return
      }

      setAuthChecked(true)

      // Build query params
      const params = new URLSearchParams()
      if (filterEmail) params.append('clientEmail', filterEmail)
      params.append('sortBy', sortBy)

      // Fetch favorites
      const response = await fetch(`/api/admin/clients-favorites?${params}`, {
        credentials: 'include',
        headers: getAuthHeaders()
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites (${response.status})`)
      }

      const data = await response.json()
      setFavorites(data.favorites || [])
      setAnalytics(data.analytics)

    } catch (error) {
      console.error('Error fetching favorites:', error)
      setError(error instanceof Error ? error.message : 'Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }, [filterEmail, sortBy, router, getAuthHeaders])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!authChecked && loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Checking authentication...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading client favorites...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
              <h1 className="text-2xl font-semibold text-foreground">Client Favorites</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track which photos your clients have marked as favorites
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {error ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md">
                <p className="text-red-600 mb-2">Error loading favorites</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={fetchFavorites}>Retry</Button>
              </div>
            </div>
          ) : !analytics || analytics.totalFavorites === 0 ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md">
                <Heart className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
                <p className="text-muted-foreground">
                  When clients mark photos as favorites in your galleries, they'll appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Total Favorites
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{analytics.totalFavorites}</div>
                      <p className="text-xs text-muted-foreground mt-1">across all collections</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Unique Photos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{analytics.uniquePhotos}</div>
                      <p className="text-xs text-muted-foreground mt-1">marked as favorite</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Unique Clients
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{analytics.uniqueClients}</div>
                      <p className="text-xs text-muted-foreground mt-1">who favorited</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Collections
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{analytics.collections}</div>
                      <p className="text-xs text-muted-foreground mt-1">with favorites</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="popular" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="popular">Most Popular Photos</TabsTrigger>
                    <TabsTrigger value="recent">Recent Favorites</TabsTrigger>
                    <TabsTrigger value="clients">Top Clients</TabsTrigger>
                  </TabsList>

                  {/* Most Popular Photos */}
                  <TabsContent value="popular" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.mostFavoritedPhotos.map((fav, idx) => (
                        <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="relative aspect-square bg-muted overflow-hidden">
                            <img
                              src={fav.photo.thumbnailUrl}
                              alt={fav.photo.originalFilename}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Heart className="h-3 w-3 fill-current" />
                              {fav.favoriteCount}
                            </div>
                            <Badge className="absolute top-2 right-2">{idx + 1}</Badge>
                          </div>
                          <CardContent className="pt-3">
                            <p className="text-xs text-muted-foreground truncate">
                              {fav.photo.originalFilename}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {fav.favoriteCount} {fav.favoriteCount === 1 ? 'client' : 'clients'} liked this
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Recent Favorites */}
                  <TabsContent value="recent" className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Input
                        placeholder="Filter by client email..."
                        value={filterEmail}
                        onChange={(e) => setFilterEmail(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilterEmail("")}
                        className={filterEmail ? "" : "opacity-50"}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {favorites.slice(0, 50).map((fav) => (
                        <Card key={fav.id} className="overflow-hidden">
                          <CardContent className="p-4 flex items-center gap-4">
                            <img
                              src={fav.photo.thumbnailUrl}
                              alt={fav.photo.originalFilename}
                              className="w-20 h-20 object-cover rounded"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{fav.photo.originalFilename}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Mail className="h-3 w-3 inline mr-1" />
                                {fav.clientEmail}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 inline mr-1" />
                                {formatDate(fav.createdAt)}
                              </p>
                              {fav.notes && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  "{fav.notes}"
                                </p>
                              )}
                            </div>
                            <Badge variant="secondary">{fav.favoriteCount} likes</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Top Clients */}
                  <TabsContent value="clients" className="space-y-4">
                    <div className="space-y-2">
                      {analytics.clientActivity.map((client) => (
                        <Card key={client.clientEmail} className="overflow-hidden hover:shadow-sm transition-shadow">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {client.clientEmail}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {client.totalFavorites} favorites
                                </span>
                                <span className="flex items-center gap-1">
                                  <Image className="h-3 w-3" />
                                  {client.collections} collections
                                </span>
                                {client.lastFavoritedAt && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(client.lastFavoritedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setFilterEmail(client.clientEmail)}
                            >
                              <Filter className="h-3 w-3" />
                              View
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}