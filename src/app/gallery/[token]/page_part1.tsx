"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Download,
  Heart,
  Share2,
  Camera,
  ExternalLink,
  Download as DownloadIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from "lucide-react"

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
  originalUrl: string
}

interface Share {
  shareToken: string
  collection: Collection
  photos: Photo[]
  isExpired: boolean
  requiresPassword: boolean
}
