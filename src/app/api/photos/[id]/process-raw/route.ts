import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SettingsSchema = z.object({
  exposure: z.number().optional(),
  shadows: z.number().optional(),
  highlights: z.number().optional(),
  contrast: z.number().optional(),
  vibrance: z.number().optional(),
  saturation: z.number().optional(),
  temperature: z.number().optional(),
  tint: z.number().optional(),
  clarity: z.number().optional(),
  sharpening: z.number().optional(),
  noiseReduction: z.number().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const settings = SettingsSchema.parse(body.settings || {})

    // Verificar que la foto existe y el usuario tiene acceso
    const photo = await prisma.photo.findFirst({
      where: {
        id,
        collection: {
          ownerId: payload.userId
        }
      }
    })

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Guardar los ajustes en exifData
    await prisma.photo.update({
      where: { id },
      data: {
        exifData: {
          ...(photo.exifData as object || {}),
          rawSettings: settings,
          processedAt: new Date().toISOString()
        },
        processingStatus: 'completed'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      processedUrl: photo.webUrl,
      thumbnailUrl: photo.thumbnailUrl
    })

  } catch (error) {
    console.error('Process RAW error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}