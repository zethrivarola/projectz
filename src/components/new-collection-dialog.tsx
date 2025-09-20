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
import { Textarea } from "@/components/ui/textarea"

const CreateCollectionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
})

type CreateCollectionData = z.infer<typeof CreateCollectionSchema>

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  visibility: 'public' | 'private' | 'password_protected'
  isStarred: boolean
  isFeatured: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  coverPhoto?: {
    id: string
    thumbnailUrl: string
    webUrl: string
  }
  _count: {
    photos: number
  }
}

interface NewCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (collection: Collection) => void
}

export function NewCollectionDialog({
  open,
  onOpenChange,
  onSuccess
}: NewCollectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCollectionData>({
    resolver: zodResolver(CreateCollectionSchema),
  })

  const onSubmit = async (data: CreateCollectionData) => {
    setIsLoading(true)

    try {
      // Get auth token for request
      const token = localStorage.getItem('auth-token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create collection')
      }

      const collection = await response.json()
      onSuccess?.(collection)
      onOpenChange(false)
      reset()
    } catch (error) {
      console.error('Error creating collection:', error)
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>NEW COLLECTION</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Collection Name</Label>
            <Input
              id="title"
              placeholder="e.g. Ceremony, Reception, Getting ready"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional"
              rows={3}
              {...register("description")}
            />
            <p className="text-xs text-muted-foreground">0 / 500</p>
            <p className="text-xs text-muted-foreground">
              Description is shown to clients viewing this collection for additional storytelling.
            </p>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
