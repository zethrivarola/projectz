'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Plus, Grid3x3, List, Eye, Share2, Trash2, Settings, HardDrive, Camera, User, Mail, Star, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ShareCollectionDialog } from '@/components/share-collection-dialog'

interface Collection {
  id: string
  title: string
  slug: string
  description?: string
  visibility: string
  isFeatured: boolean
  isStarred: boolean
  dateTaken?: string
  createdAt: string
  totalSizeBytes: string
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  coverFocalPoint?: {
    x: number
    y: number
  }
  _count: {
    photos: number
  }
}

interface Client {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  isActive: boolean
  createdAt: string
  storageUsedBytes: string
  maxStorageGB: number
  collections: Collection[]
  _count: {
    collections: number
  }
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    visibility: 'private',
  })

  useEffect(() => {
    fetchClient()
  }, [clientId])

  const fetchClient = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      
      const response = await fetch(`/api/clients/${clientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch client')

      const data = await response.json()
      setClient(data.client)
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setCreating(true)
      const token = localStorage.getItem('auth-token')

      const response = await fetch(`/api/clients/${clientId}/collections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create collection')
      }

      setFormData({ title: '', description: '', visibility: 'private' })
      setShowCreateDialog(false)
      fetchClient()
    } catch (error) {
      console.error('Error creating collection:', error)
      alert(error instanceof Error ? error.message : 'Failed to create collection')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteCollection = async (collection: Collection) => {
    if (!confirm(`¿Eliminar "${collection.title}"? Esta acción no se puede deshacer.`)) return

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to delete collection')
      
      fetchClient()
    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Error al eliminar la colección')
    }
  }

  const handleToggleStar = async (collection: Collection) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isStarred: !collection.isStarred })
      })

      if (!response.ok) throw new Error('Failed to update collection')
      
      fetchClient()
    } catch (error) {
      console.error('Error updating collection:', error)
    }
  }

  const handleCollectionVisibilityChange = async (collection: Collection, visibility: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/collections/${collection.slug}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visibility })
      })

      if (!response.ok) throw new Error('Failed to update visibility')
      
      fetchClient()
    } catch (error) {
      console.error('Error updating visibility:', error)
    }
  }

  const handleOpenShareDialog = (collection: Collection) => {
    setSelectedCollection(collection)
    setShowShareDialog(true)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatBytes = (bytes: string) => {
    const size = parseInt(bytes)
    if (size === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return Math.round((size / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatSize = (bytes: string) => {
    const num = parseInt(bytes)
    if (num === 0) return '0 B'
    if (num < 1024) return `${num} B`
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const getSizeBadgeVariant = (bytes: string): 'default' | 'secondary' | 'destructive' => {
    const gb = parseInt(bytes) / (1024 * 1024 * 1024)
    if (gb > 5) return 'destructive'
    if (gb > 1) return 'default'
    return 'secondary'
  }

  const getStatusText = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'Pública'
      case 'private': return 'Privada'
      case 'password_protected': return 'Protegida'
      default: return visibility
    }
  }

  const filteredCollections = client?.collections.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando cliente...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Cliente no encontrado</p>
          <Button onClick={() => router.push('/admin/clients')}>
            Volver a Clientes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/clients')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Clientes
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              {client.name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-slate-600">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {client.email}
              </span>
              <Badge variant={client.isActive ? "default" : "secondary"}>
                {client.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nueva Galería
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Galerías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{client.collections.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {client.collections.reduce((acc, c) => acc + c._count.photos, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Espacio Usado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatBytes(client.storageUsedBytes)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Miembro Desde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-slate-900">{formatDate(client.createdAt)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar galerías..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchClient}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collections */}
      {filteredCollections.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Camera className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {searchQuery ? 'No se encontraron galerías' : 'No hay galerías todavía'}
              </h3>
              <p className="text-slate-600 mb-6">
                {searchQuery ? 'Intenta con otra búsqueda' : `Crea la primera galería para ${client.name}`}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Galería
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {viewMode === 'grid' ? (
            // Grid View
            filteredCollections.map((collection) => (
              <Card 
                key={collection.id}
                className="hover:shadow-lg transition-shadow overflow-hidden group cursor-pointer"
                onClick={() => router.push(`/admin/collections/${collection.slug}`)}
              >
                <div className="relative h-64 bg-muted overflow-hidden">
                  {collection.coverPhoto ? (
                    <img
                      src={collection.coverPhoto.webUrl}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${collection.coverFocalPoint?.x || 50}% ${collection.coverFocalPoint?.y || 50}%`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleStar(collection)
                    }}
                    className="absolute top-3 left-3 z-10"
                  >
                    <Star className={`h-3 w-3 ${collection.isStarred ? 'fill-current' : ''}`} />
                  </Button>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {collection.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm text-muted-foreground">
                          {collection._count.photos} fotos
                        </p>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant={getSizeBadgeVariant(collection.totalSizeBytes)} className="gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatSize(collection.totalSizeBytes)}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant="outline">{getStatusText(collection.visibility)}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {collection.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Creado {formatDate(collection.createdAt)}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Visibilidad</label>
                    <Select
                      value={collection.visibility}
                      onValueChange={(value) => handleCollectionVisibilityChange(collection, value)}
                    >
                      <SelectTrigger className="h-8" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Pública</SelectItem>
                        <SelectItem value="private">Privada</SelectItem>
                        <SelectItem value="password_protected">Protegida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/admin/collections/${collection.slug}/preview`, '_blank')
                      }}
                      className="gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      <span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenShareDialog(collection)
                      }}
                      className="gap-1"
                    >
                      <Share2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCollection(collection)
                      }}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // List View
            filteredCollections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow group"
              >
                {collection.coverPhoto ? (
                  <img
                    src={collection.coverPhoto.thumbnailUrl}
                    alt={collection.title}
                    className="w-20 h-16 object-cover rounded cursor-pointer"
                    style={{
                      objectPosition: `${collection.coverFocalPoint?.x || 50}% ${collection.coverFocalPoint?.y || 50}%`
                    }}
                    onClick={() => router.push(`/admin/collections/${collection.slug}`)}
                  />
                ) : (
                  <div className="w-20 h-16 bg-muted rounded flex items-center justify-center cursor-pointer"
                    onClick={() => router.push(`/admin/collections/${collection.slug}`)}>
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/admin/collections/${collection.slug}`)}>
                  <h3 className="font-medium">{collection.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-sm text-muted-foreground">
                      {collection._count.photos} fotos • {formatDate(collection.createdAt)}
                    </div>
                    <Badge variant={getSizeBadgeVariant(collection.totalSizeBytes)} className="gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatSize(collection.totalSizeBytes)}
                    </Badge>
                  </div>
                  {collection.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {collection.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getStatusText(collection.visibility)}</Badge>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/admin/collections/${collection.slug}/preview`, '_blank')
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/admin/collections/${collection.slug}/design`)
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenShareDialog(collection)
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCollection(collection)
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleCreateCollection}>
            <DialogHeader>
              <DialogTitle>Nueva Galería para {client.name}</DialogTitle>
              <DialogDescription>
                Crea una galería privada para compartir fotos
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Cumpleaños de María"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional de la galería"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="visibility">Visibilidad</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Privada</SelectItem>
                    <SelectItem value="password_protected">🔑 Protegida con Contraseña</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creando...' : 'Crear Galería'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      {selectedCollection && (
        <ShareCollectionDialog
          collection={selectedCollection}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
        />
      )}
    </div>
  )
}
