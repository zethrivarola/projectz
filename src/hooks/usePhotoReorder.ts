import { useState } from 'react'

interface Photo {
  id: string
  orderIndex: number
}

export function usePhotoReorder<T extends Photo>(
  initialPhotos: T[],
  collectionSlug: string,
  onReorderSuccess?: () => void
) {
  const [photos, setPhotos] = useState<T[]>(initialPhotos)
  const [isSaving, setIsSaving] = useState(false)

  const reorderPhotos = async (activeId: string, overId: string) => {
    const oldIndex = photos.findIndex((p) => p.id === activeId)
    const newIndex = photos.findIndex((p) => p.id === overId)

    if (oldIndex === newIndex) return

    // Reordenar localmente primero (optimistic update)
    const newPhotos = [...photos]
    const [movedPhoto] = newPhotos.splice(oldIndex, 1)
    newPhotos.splice(newIndex, 0, movedPhoto)

    // Actualizar orderIndex
    const updatedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      orderIndex: index
    }))

    setPhotos(updatedPhotos)

    // Guardar en el servidor (auto-save)
    setIsSaving(true)
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/collections/${collectionSlug}/reorder`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photoOrders: updatedPhotos.map((photo) => ({
            id: photo.id,
            orderIndex: photo.orderIndex
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save order')
      }

      onReorderSuccess?.()
    } catch (error) {
      console.error('Error saving photo order:', error)
      // Revertir en caso de error
      setPhotos(initialPhotos)
      alert('Failed to save photo order. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    photos,
    setPhotos,
    reorderPhotos,
    isSaving
  }
}
