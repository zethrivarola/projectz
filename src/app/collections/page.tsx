"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Loader2 } from "lucide-react"

interface Collection {
  id: string
  title: string
  description?: string
  slug: string
  tags: string[]
  createdAt: Date
  _count: {
    photos: number
  }
  coverPhoto?: {
    id: string
    webUrl: string
  }
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/collections/public")
      
      if (!response.ok) {
        throw new Error("Failed to load collections")
      }

      const data = await response.json()
      setCollections(data.collections || [])
    } catch (error) {
      console.error("Error:", error)
      setError(error instanceof Error ? error.message : "Failed to load collections")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading collections...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchCollections}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Photography Collections</h1>
          <p className="text-muted-foreground">Explore our latest work</p>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No collections available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <Link key={collection.id} href={`/collections/${collection.slug}`}>
                <Card className="hover:shadow-lg transition-shadow overflow-hidden h-full cursor-pointer">
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {collection.coverPhoto ? (
                      <img
                        src={collection.coverPhoto.webUrl}
                        alt={collection.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-2 line-clamp-2">
                      {collection.title}
                    </h2>
                    
                    {collection.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {collection.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{collection._count.photos} photos</span>
                      <span>{formatDate(collection.createdAt)}</span>
                    </div>

                    {collection.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {collection.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}