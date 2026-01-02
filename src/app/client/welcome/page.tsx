"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useScroll, useTransform } from "framer-motion"
import { Camera, Calendar, ArrowRight, Loader2, Sparkles, LayoutDashboard, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  isFeatured: boolean
  tags: string[]
  dateTaken?: Date
  createdAt: Date
  coverFocalPoint?: {
    x: number
    y: number
  }
  _count: {
    photos: number
  }
}

interface ClientInfo {
  name?: string
  email: string
}

export default function ClientWelcomePage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const { scrollY } = useScroll()

  // Parallax effect para el hero
  const heroY = useTransform(scrollY, [0, 500], [0, 150])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])

  useEffect(() => {
    verifyAuth()
    fetchCollections()
  }, [])

  // Slideshow automation
  useEffect(() => {
    if (featuredCollections.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % Math.min(featuredCollections.length, 3))
      }, 4000)
      return () => clearInterval(timer)
    }
  }, [collections])

  const verifyAuth = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        router.push('/client/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        router.push('/client/login')
        return
      }

      const data = await response.json()
      
      // Verificar que sea CLIENT
      if (data.user.role !== 'CLIENT') {
        router.push('/client/login')
        return
      }

      setClientInfo({
        name: data.user.name,
        email: data.user.email
      })
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/client/login')
    }
  }

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth-token')
      
      if (!token) {
        router.push('/client/login')
        return
      }

      const response = await fetch('/api/clients/me/collections', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/client/login')
          return
        }
        throw new Error('Failed to fetch collections')
      }

      const data = await response.json()
      setCollections(data.collections)
    } catch (error) {
      console.error('Error:', error)
      setError('Error al cargar tus galerías')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth-token')
    router.push('/client/login')
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    })
  }

  // Separar colecciones destacadas de las normales
  const featuredCollections = collections.filter(c => c.isFeatured)
  const regularCollections = collections.filter(c => !c.isFeatured)

  // Para el slideshow del hero, usar las primeras 3 featured o todas si hay menos
  const heroSlides = featuredCollections.slice(0, 3)

  // Nombre de bienvenida personalizado
  const welcomeName = clientInfo?.name || clientInfo?.email?.split('@')[0] || 'Cliente'

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white dark:from-slate-950 via-gray-50 dark:via-slate-900 to-gray-100 dark:to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-500" />
          <p className="text-gray-600 dark:text-slate-400 font-light tracking-wide">Cargando tus galerías...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-red-500 mb-2 text-lg font-medium">Error al cargar tus galerías</p>
          <p className="text-sm text-gray-500 dark:text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/client/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Volver al login
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header - Dark mode */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <Camera className="h-8 w-8 text-blue-600 dark:text-blue-500" />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  RENÉ RIVAROLA
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-500 tracking-[0.2em] font-light">
                  PHOTOGRAPHY
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              {/* Dashboard button */}
              <Link
                href="/client/dashboard"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800 transition-colors text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Slideshow con fotos reales */}
      <section className="relative h-[70vh] sm:h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-white dark:from-slate-950 via-gray-50 dark:via-slate-900 to-gray-100 dark:to-slate-950">
        {/* Slides con fotos reales o gradientes de respaldo */}
        {heroSlides.length > 0 ? (
          heroSlides.map((collection, index) => {
            const focusX = collection.coverFocalPoint?.x ?? 50
            const focusY = collection.coverFocalPoint?.y ?? 50

            return (
              <motion.div
                key={collection.id}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: currentSlide === index ? 1 : 0,
                  scale: currentSlide === index ? [1, 1.1, 1] : 1
                }}
                transition={{
                  opacity: { duration: 1.5 },
                  scale: { duration: 8, repeat: Infinity }
                }}
              >
                {collection.coverPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={collection.coverPhoto.webUrl}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${focusX}% ${focusY}%`
                      }}
                    />
                    <div className="absolute inset-0 bg-slate-950/40" />
                  </div>
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${
                    index === 0 ? 'from-blue-600/30 to-cyan-600/30' :
                    index === 1 ? 'from-purple-600/30 to-pink-600/30' :
                    'from-cyan-600/30 to-blue-600/30'
                  }`} />
                )}
              </motion.div>
            )
          })
        ) : (
          // Gradiente de respaldo si no hay featured collections
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-gray-50 dark:via-slate-900 to-gray-100 dark:to-slate-950"
            animate={{
              opacity: 1,
              scale: [1, 1.1, 1]
            }}
            transition={{
              opacity: { duration: 1.5 },
              scale: { duration: 8, repeat: Infinity }
            }}
          />
        )}

        {/* Círculos decorativos con blur - Azules */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="absolute top-20 right-10 w-96 h-96 bg-blue-600 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-cyan-600 rounded-full blur-3xl pointer-events-none"
        />

        {/* Contenido del hero - PERSONALIZADO */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-8"
            >
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Tu Galería Personal</span>
            </motion.div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-gray-900 dark:text-white">
              ¡Bienvenido {welcomeName}!
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Tus momentos especiales en un solo lugar
              </span>
            </h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-lg sm:text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto mb-8 font-light leading-relaxed"
            >
              {collections.length > 0 
                ? `Tienes ${collections.length} ${collections.length === 1 ? 'galería disponible' : 'galerías disponibles'} con tus recuerdos más preciados`
                : 'Pronto tendrás acceso a tus galerías fotográficas'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="#collections"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-500 transition-all hover:gap-3 group shadow-lg shadow-blue-600/30"
              >
                Ver Mis Galerías
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/client/dashboard"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-blue-600 text-blue-600 dark:text-blue-400 rounded-full font-medium hover:bg-blue-600 hover:text-white transition-all"
              >
                <LayoutDashboard className="h-5 w-5" />
                Ir al Dashboard
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-slate-600 rounded-full flex items-start justify-center p-2"
          >
            <motion.div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
          </motion.div>
        </motion.div>

        {/* Slide indicators */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-3">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all ${
                  currentSlide === index
                    ? 'w-10 h-3 bg-white rounded-full'
                    : 'w-3 h-3 bg-slate-600 rounded-full hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Carrusel Infinito - Featured Collections CIRCULARES */}
      {featuredCollections.length > 0 && (
        <section id="collections" className="py-20 sm:py-24 overflow-hidden bg-white dark:bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                ⭐ Galerías Destacadas
              </h3>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                Tus momentos más especiales
              </p>
            </motion.div>
          </div>

          {/* Carrusel horizontal con animación infinita */}
          <div className="relative overflow-hidden py-8">
            <motion.div
              className="flex gap-8 px-4"
              animate={{
                x: [0, -(420 * featuredCollections.length)]
              }}
              transition={{
                duration: featuredCollections.length * 8,
                repeat: Infinity,
                ease: "linear"
              }}
              whileHover={{ animationPlayState: "paused" }}
              style={{ width: "max-content" }}
            >
              {/* Duplicar colecciones para efecto infinito */}
              {[...featuredCollections, ...featuredCollections].map((collection, index) => {
                const focusX = collection.coverFocalPoint?.x ?? 50
                const focusY = collection.coverFocalPoint?.y ?? 50

                return (
                  <Link
                    key={`${collection.id}-${index}`}
                    href={`/client/collections/${collection.slug}`}
                    className="group relative flex-shrink-0"
                  >
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.4 }}
                      className="relative w-[400px] h-[400px] rounded-full overflow-hidden cursor-pointer shadow-2xl hover:shadow-blue-500/30"
                    >
                      {/* Imagen de fondo */}
                      {collection.coverPhoto ? (
                        <img
                          src={collection.coverPhoto.webUrl}
                          alt={collection.title}
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${focusX}% ${focusY}%`
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full ${
                          index % 3 === 0 ? 'bg-gradient-to-br from-blue-600 to-cyan-600' :
                          index % 3 === 1 ? 'bg-gradient-to-br from-purple-600 to-pink-600' :
                          'bg-gradient-to-br from-cyan-600 to-blue-600'
                        }`} />
                      )}

                      {/* Overlay con info (aparece al hover) */}
                      <div className="absolute inset-0 bg-gradient-radial from-black/40 via-black/60 to-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col items-center justify-center text-center p-8">
                        {/* Badge destacado */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-xs font-semibold text-black">
                          ⭐ Destacado
                        </div>

                        {/* Contenido */}
                        <div className="text-white">
                          <h4 className="text-2xl font-bold mb-2">{collection.title}</h4>
                          <p className="text-sm opacity-90">
                            {collection._count.photos} fotos
                            {collection.dateTaken && ` • ${formatDate(collection.dateTaken)}`}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* Grid Estático - Todas las colecciones */}
      <section className="py-20 sm:py-24 lg:py-32 relative bg-white dark:bg-slate-950">
        {/* Background pattern sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(71,85,105,0.1)_1px,transparent_0)] bg-[size:24px_24px]" />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              {regularCollections.length > 0 ? 'Todas Tus Galerías' : 'Tus Galerías'}
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              {collections.length > 0
                ? `${collections.length} ${collections.length === 1 ? 'galería disponible' : 'galerías disponibles'}`
                : 'Pronto tendrás acceso a tus galerías'}
            </p>
          </motion.div>

          {/* Empty state */}
          {collections.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-900/50 mb-6 border border-gray-200 dark:border-slate-800">
                <Camera className="h-12 w-12 text-slate-600" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                Aún no tienes galerías disponibles
              </h3>
              <p className="text-gray-500 dark:text-slate-500 max-w-md mx-auto mb-6">
                Tu fotógrafo te notificará cuando tus fotos estén listas para ver
              </p>
              <Link
                href="/client/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Ir al Dashboard
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {/* Mostrar TODAS las colecciones (featured + regulares) */}
              {collections.map((collection, index) => {
                const focusX = collection.coverFocalPoint?.x ?? 50
                const focusY = collection.coverFocalPoint?.y ?? 50

                return (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.05,
                      ease: "easeOut"
                    }}
                  >
                    <Link
                      href={`/client/collections/${collection.slug}`}
                      className="group block"
                    >
                      <article className="bg-slate-900/50 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800/50 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 backdrop-blur-sm">
                        {/* Cover Image con overlay gradient */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-slate-900">
                          {collection.coverPhoto ? (
                            <>
                              <motion.img
                                src={collection.coverPhoto.webUrl}
                                alt={collection.title}
                                className="w-full h-full object-cover"
                                style={{
                                  objectPosition: `${focusX}% ${focusY}%`
                                }}
                                loading="lazy"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                              />

                              {/* Gradient overlay on hover */}
                              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950/80 via-slate-950/0 to-gray-100 dark:to-slate-950/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="h-16 w-16 text-slate-700 opacity-20" />
                            </div>
                          )}

                          {/* Featured Badge con glow */}
                          {collection.isFeatured && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.05 + 0.2 }}
                              className="absolute top-4 left-4"
                            >
                              <Badge className="bg-blue-600/90 backdrop-blur-md text-white shadow-lg shadow-blue-600/50 border border-blue-500/30">
                                ⭐ Destacado
                              </Badge>
                            </motion.div>
                          )}

                          {/* Photo count badge - bottom right */}
                          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-950/80 backdrop-blur-md text-gray-900 dark:text-white text-sm border border-slate-700/50">
                              <Camera className="h-3.5 w-3.5" />
                              <span className="font-medium">{collection._count.photos}</span>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                            {collection.title}
                          </h3>

                          {collection.description && (
                            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                              {collection.description}
                            </p>
                          )}

                          {/* Meta info */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-500 mb-4">
                            <div className="flex items-center gap-1.5">
                              <Camera className="h-3.5 w-3.5" />
                              <span>{collection._count.photos} fotos</span>
                            </div>

                            {collection.dateTaken && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formatDate(collection.dateTaken)}</span>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {collection.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {collection.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs font-normal border-slate-700 text-gray-600 dark:text-slate-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {collection.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs font-normal border-slate-700 text-gray-600 dark:text-slate-400">
                                  +{collection.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer - Dark */}
      <footer className="relative border-t border-gray-200 dark:border-slate-800/50 bg-white dark:bg-slate-950 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Camera className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">RENÉ RIVAROLA</span>
                <span className="text-xs text-gray-500 dark:text-slate-500 tracking-[0.2em] font-light">
                  PHOTOGRAPHY
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-32 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            {/* Copyright */}
            <p className="text-sm text-gray-500 dark:text-slate-500 text-center">
              © {new Date().getFullYear()} René Rivarola Photography. Todos los derechos reservados.
            </p>

            {/* Subtle tagline */}
            <p className="text-xs text-slate-600 text-center font-light">
              Tus momentos especiales en un solo lugar
            </p>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      </footer>
    </div>
  )
}
