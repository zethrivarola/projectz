"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Masonry from 'react-masonry-css'
import { Button } from "@/components/ui/button"
import {
  Download,
  Heart,
  Share2,
  Camera,
  Download as DownloadIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ArrowLeft,
  Check,
  Square,
  Settings,
  Loader2
} from "lucide-react"

interface CollectionPreviewProps {
  slug?: string
  token?: string
  isAdminView?: boolean
}

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
  highResUrl: string
  originalUrl: string
  width?: number
  height?: number
  fileSize?: number
}

export function CollectionPreview({ slug, token, isAdminView = false }: CollectionPreviewProps) {
  const router = useRouter()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [showFavorites, setShowFavorites] = useState(false)
  const [downloadingFavorites, setDownloadingFavorites] = useState(false)
const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')  
const [downloadFormat, setDownloadFormat] = useState<'web' | 'original'>('original')
const [showDownloadMenu, setShowDownloadMenu] = useState(false)
const [downloadJobId, setDownloadJobId] = useState<string | null>(null)
const [downloadJobStatus, setDownloadJobStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'expired'>('idle')
const [downloadProgress, setDownloadProgress] = useState(0)
const [downloadError, setDownloadError] = useState<string | null>(null)
const [downloadInfo, setDownloadInfo] = useState<{
  totalSize: number;
  estimatedParts: number;
  estimatedTime: string;
} | null>(null);

  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const backUrl = isAdminView ? '/admin' : '/'
  const backLabel = isAdminView ? 'Admin' : 'Home'
  const fetchCollection = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // Determinar si es acceso por token o slug
      const url = token 
        ? `/api/gallery/${token}` 
        : `/api/collections/${slug}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Colección no encontrada')
        }
        if (response.status === 403) {
          throw new Error('Esta colección es privada')
        }
        if (response.status === 401) {
          const data = await response.json()
if (data.requiresPassword) {
            setShowPasswordDialog(true)
            setLoading(false)
            return
          }
        }
        throw new Error('Error al cargar colección')
      }
      
      const data = await response.json()
      setCollection(data.collection)
      setPhotos(data.photos || [])
    } catch (error) {
      console.error('Error al obtener colección:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar colección')
    } finally {
      setLoading(false)
    }
  }, [slug, token])
const verifyPassword = async () => {
    if (!token || !password) return
    
    setPasswordError('')
    setLoading(true)
    
    try {
      const response = await fetch(`/api/gallery/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!response.ok) {
        setPasswordError('Contraseña incorrecta')
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setCollection(data.collection)
      setPhotos(data.photos || [])
      setShowPasswordDialog(false)
      setPassword('')
    } catch (error) {
      console.error('Error al verificar contraseña:', error)
      setPasswordError('Error al verificar contraseña')
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = useCallback(() => {
    try {
const stored = localStorage.getItem(`favorites_${slug || token}`)
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
}, [slug, token])

  useEffect(() => {
    fetchCollection()
    loadFavorites()
  }, [fetchCollection, loadFavorites])

  useEffect(() => {
    if (selectedPhoto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedPhoto])

const navigatePhoto = useCallback((direction: number) => {
    if (photos.length === 0) return
    const newIndex = (currentPhotoIndex + direction + photos.length) % photos.length
    setCurrentPhotoIndex(newIndex)
    setSelectedPhoto(photos[newIndex])
    setZoom(1)
    setRotation(0)
  }, [currentPhotoIndex, photos])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && currentPhotoIndex < photos.length - 1) {
      navigatePhoto(1)
    }

    if (isRightSwipe && currentPhotoIndex > 0) {
      navigatePhoto(-1)
    }

    setTouchStart(0)
    setTouchEnd(0)
  }

  useEffect(() => {
    if (!selectedPhoto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleCloseLightbox()
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigatePhoto(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          navigatePhoto(1)
          break
        case ' ':
          e.preventDefault()
          navigatePhoto(1)
          break
        case '=':
        case '+':
          e.preventDefault()
          setZoom(prev => Math.min(prev * 1.2, 5))
          break
        case '-':
          e.preventDefault()
          setZoom(prev => Math.max(prev / 1.2, 0.1))
          break
        case 'r':
        case 'R':
          e.preventDefault()
          setRotation(prev => (prev + 90) % 360)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhoto, navigatePhoto])

  const handleCloseLightbox = () => {
    setSelectedPhoto(null)
    setZoom(1)
    setRotation(0)
  }

  const saveFavorites = (newFavorites: Set<string>) => {
    try {
localStorage.setItem(`favorites_${slug || token}`, JSON.stringify(Array.from(newFavorites)))
    } catch (error) {
      console.error('Error saving favorites:', error)
    }
  }

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedPhoto(photo)
    setCurrentPhotoIndex(index)
  }

  const handleDownload = async (photo: Photo, format: 'web' | 'original' = 'original') => {
    try {
      const url = format === 'original' ? photo.originalUrl : photo.webUrl
      const response = await fetch(url)
      const blob = await response.blob()

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = photo.originalFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download photo')
    }
  }

  const toggleFavorite = (photoId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(photoId)) {
      newFavorites.delete(photoId)
    } else {
      newFavorites.add(photoId)
    }
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  const toggleSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos)
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId)
    } else {
      newSelection.add(photoId)
    }
    setSelectedPhotos(newSelection)
  }

  const selectAll = () => {
    setSelectedPhotos(new Set(photos.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedPhotos(new Set())
  }

  const handleClearFavorites = () => {
    if (confirm('Clear all favorites? This cannot be undone.')) {
      setFavorites(new Set())
      saveFavorites(new Set())
    }
  }

  const handleDownloadAsZip = async (photoIds?: string[]) => {
    setDownloadingFavorites(true)

    try {
      const photoCount = photoIds ? photoIds.length : photos.length

      const response = await fetch(`/api/collections/${slug}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: downloadFormat,
          photoIds: photoIds
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate ZIP')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${collection?.slug}-${downloadFormat}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('ZIP download error:', error)
      alert(error instanceof Error ? error.message : 'Failed to download ZIP. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

  const handleDownloadFavorites = async () => {
    if (favorites.size === 0) return

    setDownloadingFavorites(true)
    const favoritePhotos = photos.filter(photo => favorites.has(photo.id))

    try {
      if (favoritePhotos.length >= 10) {
        await handleDownloadAsZip(Array.from(favorites))
      } else {
        for (let i = 0; i < favoritePhotos.length; i++) {
          const photo = favoritePhotos[i]
          await handleDownload(photo, downloadFormat)

          if (i < favoritePhotos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }
    } catch (error) {
      console.error('Error downloading favorites:', error)
      alert('Some downloads may have failed. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

  const handleDownloadSelected = async () => {
    if (selectedPhotos.size === 0) return

    setDownloadingFavorites(true)
    const selectedPhotosList = photos.filter(photo => selectedPhotos.has(photo.id))

    try {
      if (selectedPhotosList.length >= 10) {
        await handleDownloadAsZip(Array.from(selectedPhotos))
      } else {
        for (let i = 0; i < selectedPhotosList.length; i++) {
          const photo = selectedPhotosList[i]
          await handleDownload(photo, downloadFormat)

          if (i < selectedPhotosList.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }
      clearSelection()
    } catch (error) {
      console.error('Error downloading selected:', error)
      alert('Some downloads may have failed. Please try again.')
    } finally {
      setDownloadingFavorites(false)
    }
  }

const downloadAllZips = async (urls: string[]) => {
  const zipUrls = urls.map((url: string) => url.trim());
  console.log(`📥 Downloading ${zipUrls.length} volumes...`);
  
  if (zipUrls.length === 1) {
    const filename = zipUrls[0].split('/').pop();
    window.location.href = `/api/downloads/file/${filename}`;
  } else {
    for (let i = 0; i < zipUrls.length; i++) {
      console.log(`📥 Downloading part ${i + 1}/${zipUrls.length}`);
      const filename = zipUrls[i].split('/').pop();
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `/api/downloads/file/${filename}`;
      document.body.appendChild(iframe);
      
      if (i < zipUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 5000);
    }
  }
};

const pollJobStatus = async (jobId: string) => {
  try {
    const response = await fetch(`/api/downloads/${jobId}`)
    if (!response.ok) throw new Error('Failed to get job status')

    const job = await response.json()
    setDownloadJobStatus(job.status)
    setDownloadProgress(job.progress)

if ((job.status === 'completed' || job.status === 'failed') && job.zipUrl) {
  const zipUrls = job.zipUrl.split(',').map((url: string) => url.trim())
  
  console.log(`📥 Downloading ${zipUrls.length} volumes...`)
  
  if (zipUrls.length === 1) {
    const filename = zipUrls[0].split('/').pop()
    window.location.href = `/api/downloads/file/${filename}`
  } else {
    for (let i = 0; i < zipUrls.length; i++) {
      console.log(`📥 Downloading part ${i + 1}/${zipUrls.length}`)
      
      const filename = zipUrls[i].split('/').pop()
      
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = `/api/downloads/file/${filename}`
      document.body.appendChild(iframe)
      
      if (i < zipUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      setTimeout(() => {
        try {
          document.body.removeChild(iframe)
        } catch (e) {}
      }, 5000)
    }
  }

  setTimeout(() => {
    setDownloadJobId(null)
    setDownloadJobStatus('idle')
    setDownloadProgress(0)
  }, 5000)
    } else if (job.status === 'failed') {

      setDownloadError(job.error || 'Download failed')
      setTimeout(() => {
        setDownloadJobId(null)
        setDownloadJobStatus('idle')
      }, 5000)
} else if (job.status === 'expired') {
      setDownloadError('El enlace de descarga expiró. Por favor, genera una nueva descarga.')
      setTimeout(() => {
        setDownloadJobId(null)
        setDownloadJobStatus('idle')
      }, 5000)
      } else if (job.status === 'pending' || job.status === 'processing') {
      setTimeout(() => pollJobStatus(jobId), 2000)
    }
  } catch (error) {
    console.error('Error polling job status:', error)
    setDownloadError('Failed to check download status')
  }
}

const pollJobStatusWithEmail = async (jobId: string, email: string) => {
  const maxAttempts = 120; // 2 minutos de polling
  let attempts = 0;

  const checkStatus = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/downloads/${jobId}`);
      if (!res.ok) throw new Error('Error al obtener status');

      const job = await res.json();
      setDownloadProgress(job.progress || 0);

      if (job.status === 'completed') {
        setDownloadJobStatus('completed');
        setDownloadError(null);
        // Mostrar mensaje de éxito y cerrar después de 5 segundos
        setTimeout(() => {
          setDownloadJobId(null);
          setDownloadJobStatus('idle');
          setDownloadProgress(0);
          setDownloadInfo(null);
        }, 5000);
        return;
      }

      if (job.status === 'failed') {
        throw new Error(job.error || 'Error desconocido');
      }

      attempts++;
      if (attempts < maxAttempts && (job.status === 'pending' || job.status === 'processing')) {
        setTimeout(checkStatus, 1000);
      } else if (attempts >= maxAttempts) {
        // Después de 2 minutos, asumir que seguirá procesando
        setDownloadJobStatus('idle');
        setDownloadJobId(null);
        setDownloadInfo(null);
        alert(`Tu descarga se está preparando en segundo plano.\n\nRecibirás un email en ${email} cuando esté lista.`);
      }
    } catch (error) {
      console.error('Error polling:', error);
      setDownloadError('Error al verificar el estado de la descarga');
      setDownloadJobStatus('idle');
      setTimeout(() => {
        setDownloadJobId(null);
        setDownloadInfo(null);
      }, 5000);
    }
  };

  await checkStatus();
};

const handleDownloadAllProfessional = async () => {
  if (photos.length === 0) return;

  // Calcular tamaño total y número de ZIPs
  const totalSizeBytes = photos.reduce((sum, photo) => {
    return sum + (photo.fileSize || 0);
  }, 0);

  const CHUNK_SIZE = 7 * 1024 * 1024 * 1024; // 7GB sin comprimir
  const COMPRESSION_RATIO = 0.7; // RAW comprime ~70%

  const estimatedParts = Math.ceil((totalSizeBytes * COMPRESSION_RATIO) / (5 * 1024 * 1024 * 1024)); // ~5GB por ZIP
  const estimatedMinutes = Math.ceil((totalSizeBytes / (1024 * 1024 * 1024)) / 2); // ~2GB por minuto estimado

  const zipSizePerPart = estimatedParts > 1
    ? ` (~${Math.round((totalSizeBytes * COMPRESSION_RATIO) / estimatedParts / (1024 * 1024 * 1024) * 100) / 100}GB cada uno)`
    : '';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalSizeGB = formatBytes(totalSizeBytes);
  const estimatedZipSize = formatBytes(totalSizeBytes * COMPRESSION_RATIO);
  
  // Determinar si es una colección grande (>10GB o >200 fotos)
  const isLargeCollection = totalSizeBytes > 10 * 1024 * 1024 * 1024 || photos.length > 200;

  // Modal mejorado con campo de email
  const shouldShowEmailField = isLargeCollection && downloadFormat === 'original';
  let userEmail = '';
  let emailValid = false;

  if (shouldShowEmailField) {
    // Mostrar modal personalizado con campo de email
    const modalResult = await new Promise<{confirmed: boolean, email?: string}>((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm';
      modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-[90vw]">
          <h3 class="text-xl font-semibold mb-4">¿Descargar ${photos.length} fotos en calidad original?</h3>
          
          <div class="space-y-2 text-sm text-gray-600 mb-6">
            <p>📦 <strong>Tamaño total:</strong> ${totalSizeGB}</p>
            <p>📁 <strong>Se generarán:</strong> ${estimatedParts} ${estimatedParts === 1 ? 'archivo ZIP' : 'archivos ZIP'}${zipSizePerPart}</p>
            <p>💾 <strong>Descarga total:</strong> ~${estimatedZipSize}</p>
            <p>⏱️ <strong>Tiempo estimado:</strong> ${estimatedMinutes}-${estimatedMinutes + 2} minutos</p>
          </div>

          <div class="mb-6">
            <div class="flex items-start gap-2 mb-3 p-3 bg-blue-50 rounded-lg">
              <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-sm text-blue-800">
                Esta es una colección grande. Te enviaremos un email cuando tu descarga esté lista.
              </p>
            </div>

            <label class="block mb-2">
              <div class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Email para notificación
              </div>
              <input
                type="email"
                id="notification-email"
                placeholder="tu@email.com"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p id="email-error" class="text-red-600 text-xs mt-1 hidden"></p>
            </label>
          </div>

          <div class="bg-gray-50 p-3 rounded text-xs text-gray-600 mb-6">
            Se procesará en segundo plano. Recibirás un email con el link de descarga.
          </div>

          <div class="flex gap-3">
            <button
              id="modal-cancel"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="modal-confirm"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Confirmar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const emailInput = modal.querySelector('#notification-email') as HTMLInputElement;
      const emailError = modal.querySelector('#email-error') as HTMLElement;
      const confirmBtn = modal.querySelector('#modal-confirm') as HTMLButtonElement;
      const cancelBtn = modal.querySelector('#modal-cancel') as HTMLButtonElement;

      const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
      };

      emailInput.addEventListener('input', () => {
        const value = emailInput.value.trim();
        if (value && !validateEmail(value)) {
          emailError.textContent = 'Por favor ingresa un email válido';
          emailError.classList.remove('hidden');
          confirmBtn.disabled = true;
        } else if (!value) {
          emailError.textContent = 'Por favor ingresa tu email para recibir la notificación';
          emailError.classList.remove('hidden');
          confirmBtn.disabled = true;
        } else {
          emailError.classList.add('hidden');
          confirmBtn.disabled = false;
        }
      });

      confirmBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        if (email && validateEmail(email)) {
          document.body.removeChild(modal);
          resolve({ confirmed: true, email });
        }
      });

      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve({ confirmed: false });
      });

      setTimeout(() => emailInput.focus(), 100);
    });

    if (!modalResult.confirmed) return;
    userEmail = modalResult.email || '';
    emailValid = true;
  } else {
    // Modal simple sin email
    const message = downloadFormat === 'original'
      ? `¿Descargar ${photos.length} fotos en calidad original?\n\n📦 Tamaño total: ${totalSizeGB}\n📁 Se generarán: ${estimatedParts} ${estimatedParts === 1 ? 'archivo ZIP' : 'archivos ZIP'}${zipSizePerPart}\n💾 Descarga total: ~${estimatedZipSize}\n⏱️ Tiempo estimado: ${estimatedMinutes}-${estimatedMinutes + 2} minutos\n\nSe procesará en segundo plano.`
      : `¿Descargar ${photos.length} fotos en calidad web?\n\n📦 Tamaño estimado: ~${Math.round(photos.length * 3)}MB\n\nSe procesará en segundo plano.`;

    if (!confirm(message)) return;
  }

  // Guardar info para mostrar durante el proceso
  setDownloadInfo({
    totalSize: totalSizeBytes,
    estimatedParts: estimatedParts || 1,
    estimatedTime: `${estimatedMinutes}-${estimatedMinutes + 2} min`
  });

  try {
    setDownloadJobStatus('pending');
    setDownloadProgress(0);
    setDownloadError(null);

const response = await fetch(`/api/collections/${slug}/download`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    format: downloadFormat,
    notificationEmail: userEmail || undefined
  })
});

if (!response.ok) {
  const error = await response.json();
  
  // Manejar específicamente el error 429 (rate limit)
  if (response.status === 429) {
    const resetTime = new Date(error.resetTime);
    const minutesRemaining = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60));
    
    alert(`⏱️ Límite de descargas alcanzado\n\nHas alcanzado el máximo de descargas permitidas por hora.\n\nIntenta nuevamente en: ${minutesRemaining} minutos\nReinicio: ${resetTime.toLocaleTimeString('es-PY')}`);
    throw new Error(error.error || 'Rate limit exceeded');
  }
  
  throw new Error(error.error || 'Failed to create download');
}

const data = await response.json();
setDownloadJobId(data.jobId);

// Si es caché, descargar inmediatamente
if (data.cached && data.status === 'completed' && data.zipUrl) {
  console.log('✅ Cache hit! Starting immediate download...');
  setDownloadJobStatus('completed');
  setDownloadProgress(100);
  
  if (userEmail) {
    setDownloadError(null);
    alert(`¡Descarga lista desde caché!\n\nSe ha enviado un email a ${userEmail} con el link de descarga.`);
    setTimeout(() => {
      setDownloadJobId(null);
      setDownloadJobStatus('idle');
      setDownloadInfo(null);
    }, 3000);
  } else {
    // Descargar inmediatamente
    const urls = data.zipUrl.split(',').map((url: string) => url.trim());
    await downloadAllZips(urls);
    setDownloadJobId(null);
    setDownloadJobStatus('idle');
    setDownloadInfo(null);
  }
  return;
}

// Si hay email, usar polling más ligero
if (userEmail && emailValid) {
  pollJobStatusWithEmail(data.jobId, userEmail);
} else {
  pollJobStatus(data.jobId);
}

} catch (error) {
  console.error('Error creating download:', error);
  
  // Manejar error de rate limiting
  if (error instanceof Error && error.message.includes('límite')) {
    setDownloadError('⏱️ Has alcanzado el límite de descargas. Intenta nuevamente en una hora.');
  } else {
    setDownloadError(error instanceof Error ? error.message : 'Failed to start download');
  }
  
  setDownloadJobStatus('idle');
  setDownloadInfo(null);
}
};

const handleDownloadSelectedProfessional = async () => {
  if (selectedPhotos.size === 0) return

  try {
    setDownloadJobStatus('pending')
    setDownloadProgress(0)
    setDownloadError(null)

    const response = await fetch(`/api/collections/${slug}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: downloadFormat,
        photoIds: Array.from(selectedPhotos)
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create download')
    }

const data = await response.json();
setDownloadJobId(data.jobId);

// Si es caché, descargar inmediatamente
if (data.cached && data.status === 'completed' && data.zipUrl) {
  console.log('✅ Cache hit! Starting immediate download...');
  setDownloadJobStatus('completed');
  setDownloadProgress(100);
  
  const urls = data.zipUrl.split(',').map((url: string) => url.trim());
  await downloadAllZips(urls);
  setDownloadJobId(null);
  setDownloadJobStatus('idle');
  return;
}

pollJobStatus(data.jobId);

} catch (error) {
  console.error('Error creating download:', error);
  
  if (error instanceof Error && error.message.includes('límite')) {
    setDownloadError('⏱️ Has alcanzado el límite de descargas. Intenta nuevamente en una hora.');
  } else {
    setDownloadError(error instanceof Error ? error.message : 'Failed to start download');
  }
  
  setDownloadJobStatus('idle');
}
}

const handleDownloadFavoritesProfessional = async () => {
  if (favorites.size === 0) return

  try {
    setDownloadJobStatus('pending')
    setDownloadProgress(0)
    setDownloadError(null)

    const response = await fetch(`/api/collections/${slug}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: downloadFormat,
        photoIds: Array.from(favorites)
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create download')
    }

const data = await response.json();
setDownloadJobId(data.jobId);

// Si es caché, descargar inmediatamente
if (data.cached && data.status === 'completed' && data.zipUrl) {
  console.log('✅ Cache hit! Starting immediate download...');
  setDownloadJobStatus('completed');
  setDownloadProgress(100);
  
  const urls = data.zipUrl.split(',').map((url: string) => url.trim());
  await downloadAllZips(urls);
  setDownloadJobId(null);
  setDownloadJobStatus('idle');
  return;
}

pollJobStatus(data.jobId);

} catch (error) {
  console.error('Error creating download:', error);
  
  if (error instanceof Error && error.message.includes('límite')) {
    setDownloadError('⏱️ Has alcanzado el límite de descargas. Intenta nuevamente en una hora.');
  } else {
    setDownloadError(error instanceof Error ? error.message : 'Failed to start download');
  }
  
  setDownloadJobStatus('idle');
}
}

const handleShare = () => {
  const publicUrl = `${window.location.origin}/collections/${slug}`

  if (navigator.share) {
    navigator.share({
      title: collection?.title,
      text: `Check out this photo collection: ${collection?.title}`,
      url: publicUrl
    }).catch(console.error)
  } else {
    navigator.clipboard.writeText(publicUrl).then(() => {
      alert('Collection link copied to clipboard!')
    }).catch(() => {
      alert('Unable to copy link. Please copy the URL manually.')
    })
  }
}

  const scrollToGallery = () => {
    const gallerySection = document.getElementById('gallery-section')
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToCover = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const favoritePhotos = photos.filter(photo => favorites.has(photo.id))

  const design = collection?.design || {
    coverLayout: 'center',
    typography: { titleFont: 'Inter', titleSize: 48, titleColor: '#ffffff' },
    colors: { background: '#ffffff', accent: '#000000' },
    grid: { columns: 4, spacing: 8 },
    coverFocus: { x: 50, y: 50 }
  }

// Balance photos across columns by height (responsive)
  const balancedPhotos = useMemo(() => {
    const photosToBalance = showFavorites ? favoritePhotos : photos;
    
    if (photosToBalance.length === 0) return {
      desktop: [],
      tablet: [],
      mobile: []
    };
    
    // Helper function to balance photos into columns
    const balanceIntoColumns = (numCols: number) => {
      const columns: Photo[][] = Array.from({ length: numCols }, () => []);
      const columnHeights: number[] = Array(numCols).fill(0);
      
      photosToBalance.forEach(photo => {
        const aspectRatio = (photo.height && photo.width) 
          ? photo.height / photo.width 
          : 1;
        
        const minIndex = columnHeights.indexOf(Math.min(...columnHeights));
        columns[minIndex].push(photo);
        columnHeights[minIndex] += aspectRatio;
      });
      
      return columns;
    };
    
    return {
      desktop: balanceIntoColumns(design.grid.columns || 4),
      tablet: balanceIntoColumns(3),
      mobile: balanceIntoColumns(2)
    };
  }, [photos, favoritePhotos, showFavorites, design.grid.columns]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

if (showPasswordDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Galería Protegida</h3>
            <p className="text-sm text-gray-600 mb-6">
              Esta galería requiere una contraseña para acceder.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              verifyPassword();
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa la contraseña"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      setPassword('');
                      setPasswordError('');
                      router.push('/');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={loading || !password}
                  >
                    {loading ? 'Verificando...' : 'Acceder'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Collection Not Available</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href={backUrl}>
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {backLabel}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

return (
    <div className="overflow-x-hidden w-full max-w-full">
      {/* Cover Section */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          backgroundColor: design.colors.background,
          height: '100vh',
          maxHeight: '100vh'
        }}
      >
        {collection.coverPhoto ? (
          <img
            src={collection.coverPhoto.webUrl}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${design.coverFocus.x}% ${design.coverFocus.y}%`
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <Camera className="h-24 w-24 opacity-20" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/40"></div>

        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href={backUrl}>
              <Button size="sm" variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30 text-xs">
                <ArrowLeft className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Button>
            </Link>

            {isAdminView && (
              <Link href={`/admin/collections/${slug}`}>
                <Button size="sm" variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30 text-xs">
                  <Settings className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Manage</span>
                </Button>
              </Link>
            )}
          </div>

          <Button onClick={handleShare} size="sm" variant="outline" className="bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30 text-xs">
            <Share2 className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
          <h1
            className="font-bold tracking-wide text-center mb-4 sm:mb-8"
            style={{
              fontFamily: design.typography.titleFont,
              fontSize: `clamp(24px, 8vw, ${design.typography.titleSize}px)`,
              color: design.typography.titleColor
            }}
          >
            {collection.title.toUpperCase()}
          </h1>

          <div className="mb-4 sm:mb-12">
            <p className="text-white/80 text-xs sm:text-sm tracking-wider text-center">
              RENE RIVAROLA PHOTOGRAPHY
            </p>
          </div>

          <Button
            onClick={scrollToGallery}
            size="sm"
            variant="ghost"
            className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 px-3 py-2 text-xs animate-bounce"
          >
            <ChevronDown className="h-5 w-5 mr-1" />
            View Photos
          </Button>
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 hidden sm:flex flex-col items-center">
          <p className="text-xs mb-2">SCROLL DOWN</p>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </div>
      </section>
{/* Gallery Section */}
      <section id="gallery-section" className="min-h-screen" style={{ backgroundColor: design.colors.background }}>
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="w-full max-w-full px-2 sm:px-4 md:px-6 py-3 sm:py-4 overflow-x-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-2xl font-bold truncate" style={{ fontFamily: design.typography.titleFont, color: design.colors.accent }}>
                  {collection.title.toUpperCase()}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">RENE RIVAROLA PHOTOGRAPHY</p>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-wrap flex-shrink-0">
                {selectedPhotos.size > 0 && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="default"
                      onClick={handleDownloadSelected}
                      size="sm"
                      disabled={downloadingFavorites}
                      className="text-xs px-2 sm:px-3"
                    >
                      <DownloadIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Download ({selectedPhotos.size})</span>
                      <span className="sm:hidden">{selectedPhotos.size}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={clearSelection}
                      size="sm"
                      className="text-xs px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {favorites.size > 0 && (
                  <Button
                    variant={showFavorites ? "default" : "outline"}
                    onClick={() => setShowFavorites(!showFavorites)}
                    size="sm"
                    className="text-xs px-2 sm:px-3"
                  >
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 ${favorites.size > 0 ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">({favorites.size})</span>
                  </Button>
                )}

<>
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
    className="text-xs px-2 sm:px-3"
  >
    <DownloadIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
    <span className="hidden sm:inline">Download</span>
    <ChevronDown className="h-3 w-3 ml-1" />
  </Button>

  {/* Modal Flotante */}
  {showDownloadMenu && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDownloadMenu(false)}>
      <div className="bg-white rounded-lg shadow-2xl w-80 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Download Options</h3>
          <button
            onClick={() => setShowDownloadMenu(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Quality Selector */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Quality</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDownloadFormat('web')}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-all ${
                downloadFormat === 'web'
                  ? 'bg-blue-500 border-blue-500 text-white font-medium'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              1080p
            </button>
            <button
              onClick={() => setDownloadFormat('original')}
              className={`flex-1 px-3 py-2 text-sm rounded border transition-all ${
                downloadFormat === 'original'
                  ? 'bg-blue-500 border-blue-500 text-white font-medium'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              Original
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2">
          {selectedPhotos.size > 0 && (
            <button
              onClick={() => {
                setShowDownloadMenu(false)
handleDownloadSelectedProfessional()
              }}
              disabled={downloadingFavorites}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Selected Photos</span>
              </div>
              <span className="text-xs text-gray-500">{selectedPhotos.size}</span>
            </button>
          )}

          {favorites.size > 0 && (
            <button
              onClick={() => {
                setShowDownloadMenu(false)
handleDownloadFavoritesProfessional()
              }}
              disabled={downloadingFavorites}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 text-red-500 fill-current" />
                <span className="font-medium">Favorites</span>
              </div>
              <span className="text-xs text-gray-500">{favorites.size}</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowDownloadMenu(false)
handleDownloadAllProfessional()
            }}
            disabled={downloadingFavorites}
            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 rounded flex items-center justify-between disabled:opacity-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DownloadIcon className="h-4 w-4 text-blue-500" />
              <span className="font-medium">All Photos</span>
            </div>
            <span className="text-xs text-gray-500">{photos.length}</span>
          </button>

          {downloadingFavorites && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-sm text-blue-600 px-4 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Preparing download...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )}
</>

{/* Download Progress Overlay */}
                {downloadJobStatus !== 'idle' && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-[500px] max-w-[90vw]">
                      {downloadJobStatus === 'pending' && (
                        <>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            <div>
                              <p className="font-semibold text-gray-900 text-lg">Preparing download...</p>
                              <p className="text-sm text-gray-600">Setting up compression job</p>
                            </div>
                          </div>
                          {downloadInfo && (
                            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                              <p className="text-sm text-gray-700">
                                📦 <span className="font-medium">{photos.length} photos</span>
                              </p>
                              <p className="text-sm text-gray-700">
                                📁 <span className="font-medium">{downloadInfo.estimatedParts} ZIP files</span> (~5GB each)
                              </p>
                              <p className="text-sm text-gray-700">
                                ⏱️ <span className="font-medium">~{downloadInfo.estimatedTime}</span> estimated
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {downloadJobStatus === 'processing' && (
                        <>
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-gray-900 text-lg">Compressing photos...</p>
                              <p className="text-sm font-medium text-blue-600">{downloadProgress}%</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-blue-500 h-3 transition-all duration-300 ease-out"
                                style={{ width: `${downloadProgress}%` }}
                              />
                            </div>
                            {downloadInfo && (
                              <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-2">
                                <p className="text-xs text-gray-600">
                                  Creating {downloadInfo.estimatedParts} ZIP files...
                                </p>
                                <p className="text-xs text-gray-600">
                                  This may take {downloadInfo.estimatedTime}
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {downloadJobStatus === 'completed' && (
                        <>
                          <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                              <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <p className="font-semibold text-gray-900 text-lg mb-2">Download Ready!</p>
                            <p className="text-sm text-gray-600 mb-2">
                              Multiple files will download automatically.
                            </p>
                            <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded mt-2">
                              💡 <strong>Tip:</strong> Each ZIP file is independent and can be extracted with your system's default tool.
                            </p>
                          </div>
                        </>
                      )}

                      {downloadJobStatus === 'failed' && downloadError && (
                        <>
                          <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                              <X className="h-8 w-8 text-red-600" />
                            </div>
                            <p className="font-semibold text-gray-900 text-lg mb-2">Download Failed</p>
                            <p className="text-sm text-gray-600">{downloadError}</p>
                            <Button
                              onClick={() => {
                                setDownloadJobId(null)
                                setDownloadJobStatus('idle')
                                setDownloadError(null)
                              }}
                              className="mt-4"
                            >
                              Close
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={handleShare} size="sm" className="text-xs">
                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button variant="outline" onClick={scrollToCover} size="sm" className="text-xs">
                  <span className="hidden sm:inline">Back to Top</span>
                  <span className="sm:hidden">Top</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Grid */}

<div className="w-full max-w-full px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 overflow-x-hidden">
{photos.length > 0 ? (
  <>
    {/* Desktop (4+ columnas) */}
    <div className="hidden lg:flex w-full" style={{ gap: `${design.grid.spacing || 8}px` }}>
      {balancedPhotos.desktop.map((column, columnIndex) => (
        <div key={columnIndex} className="flex-1 flex flex-col" style={{ gap: `${design.grid.spacing || 8}px` }}>
          {column.map((photo) => {
            const actualIndex = photos.findIndex(p => p.id === photo.id);
            return (
              <div
                key={photo.id}
                className="relative group cursor-pointer overflow-hidden rounded transition-all"
                onClick={() => handlePhotoClick(photos[actualIndex], actualIndex)}
              >
                <img
                  src={photo.webUrl}
                  alt={photo.originalFilename}
                  className="w-full h-auto object-cover block"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all pointer-events-none"></div>
                
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                    title="Add to favorites"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(photo.id) ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(photo, downloadFormat); }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                    title="Download photo"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const photoUrl = `${window.location.origin}${window.location.pathname}#${photo.id}`;
                      navigator.clipboard.writeText(photoUrl);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                    title="Share photo"
                  >
                    <Share2 className="w-4 h-4 text-gray-700" />
                  </button>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelection(photo.id); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Select photo"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    selectedPhotos.has(photo.id) ? 'bg-blue-500 border-blue-500' : 'bg-white/90 border-white backdrop-blur-sm'
                  }`}>
                    {selectedPhotos.has(photo.id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>

    {/* Tablet (3 columnas) */}
    <div className="hidden md:flex lg:hidden w-full" style={{ gap: `${design.grid.spacing || 8}px` }}>
      {balancedPhotos.tablet.map((column, columnIndex) => (
        <div key={columnIndex} className="flex-1 flex flex-col" style={{ gap: `${design.grid.spacing || 8}px` }}>
          {column.map((photo) => {
            const actualIndex = photos.findIndex(p => p.id === photo.id);
            return (
              <div
                key={photo.id}
                className="relative group cursor-pointer overflow-hidden rounded transition-all"
                onClick={() => handlePhotoClick(photos[actualIndex], actualIndex)}
              >
                <img
                  src={photo.webUrl}
                  alt={photo.originalFilename}
                  className="w-full h-auto object-cover block"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all pointer-events-none"></div>
                
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(photo.id) ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(photo, downloadFormat); }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const photoUrl = `${window.location.origin}${window.location.pathname}#${photo.id}`;
                      navigator.clipboard.writeText(photoUrl);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <Share2 className="w-4 h-4 text-gray-700" />
                  </button>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelection(photo.id); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    selectedPhotos.has(photo.id) ? 'bg-blue-500 border-blue-500' : 'bg-white/90 border-white backdrop-blur-sm'
                  }`}>
                    {selectedPhotos.has(photo.id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>

    {/* Mobile (2 columnas) */}
    <div className="flex md:hidden w-full" style={{ gap: `${design.grid.spacing || 8}px` }}>
      {balancedPhotos.mobile.map((column, columnIndex) => (
        <div key={columnIndex} className="flex-1 flex flex-col" style={{ gap: `${design.grid.spacing || 8}px` }}>
          {column.map((photo) => {
            const actualIndex = photos.findIndex(p => p.id === photo.id);
            return (
              <div
                key={photo.id}
                className="relative group cursor-pointer overflow-hidden rounded transition-all"
                onClick={() => handlePhotoClick(photos[actualIndex], actualIndex)}
              >
                <img
                  src={photo.webUrl}
                  alt={photo.originalFilename}
                  className="w-full h-auto object-cover block"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all pointer-events-none"></div>
                
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <Heart className={`w-4 h-4 ${favorites.has(photo.id) ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(photo, downloadFormat); }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const photoUrl = `${window.location.origin}${window.location.pathname}#${photo.id}`;
                      navigator.clipboard.writeText(photoUrl);
                    }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                  >
                    <Share2 className="w-4 h-4 text-gray-700" />
                  </button>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelection(photo.id); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                    selectedPhotos.has(photo.id) ? 'bg-blue-500 border-blue-500' : 'bg-white/90 border-white backdrop-blur-sm'
                  }`}>
                    {selectedPhotos.has(photo.id) && <Check className="w-4 h-4 text-white" />}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  </>
) : (
  <div className="text-center py-12">
    <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
    <p className="text-gray-600">No photos in this collection yet</p>
  </div>
)}
        </div>
      </section>

{/* Lightbox */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header - Responsive */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-black/80 backdrop-blur-sm shrink-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseLightbox}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFavorite(selectedPhoto.id)
                }}
                className={`p-2 rounded-full transition-colors ${
                  favorites.has(selectedPhoto.id)
                    ? 'bg-red-500/20 text-red-500'
                    : 'text-white hover:bg-white/20'
                }`}
                title="Add to favorites"
              >
                <Heart className={`h-5 w-5 ${favorites.has(selectedPhoto.id) ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload(selectedPhoto, downloadFormat)
                }}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const photoUrl = `${window.location.origin}${window.location.pathname}#${selectedPhoto.id}`
                  navigator.clipboard.writeText(photoUrl)
                }}
                className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>

              {/* Desktop only controls */}
              <div className="hidden sm:flex items-center gap-2 border-l border-white/20 pl-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoom(prev => Math.max(prev / 1.2, 0.1))
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setZoom(prev => Math.min(prev * 1.2, 5))
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setRotation(prev => (prev + 90) % 360)
                  }}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  title="Rotate"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Image Area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden" style={{ minHeight: 0 }}>
            {/* Navigation Buttons - Desktop only */}
            {currentPhotoIndex > 0 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => { e.stopPropagation(); navigatePhoto(-1); }}
                className="absolute left-2 sm:left-4 z-10 text-white hover:text-white hover:bg-white/20 hidden sm:flex"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}
            {currentPhotoIndex < photos.length - 1 && (
              <Button
                variant="ghost"
                size="lg"
                onClick={(e) => { e.stopPropagation(); navigatePhoto(1); }}
                className="absolute right-2 sm:right-4 z-10 text-white hover:text-white hover:bg-white/20 hidden sm:flex"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            <div
              className="w-full h-full flex items-center justify-center p-2 sm:p-4"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={selectedPhoto.webUrl}
                alt={selectedPhoto.originalFilename}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
              />
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="shrink-0 bg-black/80 backdrop-blur-sm border-t border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 p-2 sm:p-4 min-w-max">
                {photos.map((photo, index) => {
                  const isActive = photo.id === selectedPhoto.id
                  const isFav = favorites.has(photo.id)
                  return (
                    <button
                      key={photo.id}
                      onClick={() => handlePhotoClick(photo, index)}
                      className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden transition-all ${
                        isActive
                          ? 'ring-2 ring-white scale-110'
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img
                        src={photo.thumbnailUrl}
                        alt={photo.originalFilename}
                        className="w-full h-full object-cover"
                      />
                      {isFav && (
                        <div className="absolute top-1 left-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <Heart className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-white text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts Info - Desktop only */}
          <div className="hidden sm:block absolute bottom-32 left-4 text-white/50 text-xs pointer-events-none">
            <p>← → Navigate • +/- Zoom • R Rotate • ESC Close</p>
          </div>
        </div>
      )}
    </div>
  )
}
