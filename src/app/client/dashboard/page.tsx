"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Camera, LogOut, Loader2, Image } from "lucide-react"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Button } from "@/components/ui/button"

interface User {
  id: string
  email: string
  name?: string
  role: string
}

interface Collection {
  id: string
  slug: string
  title: string
  description?: string
  coverPhoto?: {
    thumbnailUrl: string
    webUrl: string
  }
  _count: {
    photos: number
  }
  createdAt: string
}

export default function ClientDashboard() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
const [user, setUser] = useState<User | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    // Obtener usuario de localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
    fetchCollections()
  }, [])

  async function fetchCollections() {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      
      const response = await fetch('/api/clients/me/collections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }

      const data = await response.json()
      setCollections(data.collections || [])
    } catch (error) {
      console.error('Error fetching collections:', error)
      setError('Error al cargar tus galerías')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')
      router.push('/client/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando tus galerías...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <div>
                <Breadcrumbs items={[
                  { label: "Mis Galerías", href: "/client/dashboard" }
                ]} />
                <h1 className="text-lg font-bold text-gray-900">Mis Galerías</h1>
                {user && (
                  <p className="text-xs text-gray-500">{user.name || user.email}</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {collections.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Image className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No tienes galerías disponibles
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Tu fotógrafo aún no ha compartido galerías contigo. 
              Recibirás un email cuando estén listas.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tus Galerías
              </h2>
              <p className="text-gray-600">
                {collections.length} {collections.length === 1 ? 'galería disponible' : 'galerías disponibles'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/client/collections/${collection.slug}`}
                  className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {collection.coverPhoto ? (
                      <img
                        src={collection.coverPhoto.webUrl}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    
                    {/* Photo count badge */}
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                      {collection._count.photos} fotos
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {collection.title}
                    </h3>
                    {collection.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
