import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'  // Added missing import
import { AuthService } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

interface Collection {
  id: string
  slug: string
  title: string
  ownerId: string
  [key: string]: unknown
}

interface Photo {
  id: string
  collectionId: string
  filename: string
  [key: string]: unknown
}

// Use the same global storage
declare global {
  var demoCollections: Map<string, Collection>
  var demoPhotos: Map<string, Photo>
}

if (!global.demoCollections) {
  global.demoCollections = new Map()
}

if (!global.demoPhotos) {
  global.demoPhotos = new Map()
}

const demoCollections = global.demoCollections
const demoPhotos = global.demoPhotos

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Fixed: properly await and destructure params
    const resolvedParams = await params
    const { slug } = resolvedParams
    
    // Verify collection ownership and get collection
    const collection = await prisma.collection.findFirst({
      where: {
        slug: slug,
        ownerId: payload.userId
      }
    })
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    
    // Delete all photos in the collection first
    await prisma.photo.deleteMany({
      where: {
        collectionId: collection.id
      }
    })
    
    // Delete all shares for this collection
    await prisma.collectionShare.deleteMany({
      where: {
        collectionId: collection.id
      }
    })
    
    // Delete the collection
    await prisma.collection.delete({
      where: {
        id: collection.id
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Collection DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}