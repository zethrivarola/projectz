import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

const UpdateWatermarkSchema = z.object({
  name: z.string().optional(),
  position: z.enum(['top_left', 'top_right', 'bottom_left', 'bottom_right', 'center']).optional(),
  scale: z.number().min(0.05).max(0.5).optional(),
  opacity: z.number().min(0.1).max(1).optional(),
})

// PATCH /api/watermarks/[id] - Update watermark settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Fixed: changed from 'slug' to 'id'
) {
  try {
    // Fixed: await params and destructure id correctly
    const resolvedParams = await params
    const { id } = resolvedParams  // Fixed: changed from 'slug' to 'id'
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const data = UpdateWatermarkSchema.parse(body)

    // Verify watermark ownership
    const watermark = await prisma.watermark.findFirst({
      where: {
        id: id,  // Fixed: use destructured 'id' instead of 'params.id'
        ownerId: payload.userId
      }
    })

    if (!watermark) {
      return NextResponse.json({ error: 'Watermark not found' }, { status: 404 })
    }

    // Update watermark
    const updatedWatermark = await prisma.watermark.update({
      where: { id: id },  // Fixed: use destructured 'id' instead of 'params.id'
      data: {
        ...(data.name && { name: data.name }),
        ...(data.position && { position: data.position }),
        ...(data.scale !== undefined && { scale: data.scale }),
        ...(data.opacity !== undefined && { opacity: data.opacity }),
      }
    })

    return NextResponse.json(updatedWatermark)

  } catch (error) {
    console.error('Watermark update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/watermarks/[id] - Delete watermark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // Fixed: changed from 'slug' to 'id'
) {
  try {
    // Fixed: await params and destructure id correctly
    const resolvedParams = await params
    const { id } = resolvedParams  // Fixed: changed from 'slug' to 'id'
    
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Verify watermark ownership
    const watermark = await prisma.watermark.findFirst({
      where: {
        id: id,  // Fixed: use destructured 'id' instead of 'params.id'
        ownerId: payload.userId
      }
    })

    if (!watermark) {
      return NextResponse.json({ error: 'Watermark not found' }, { status: 404 })
    }

    // Check if watermark is being used by any collections
    const collectionsUsingWatermark = await prisma.collection.count({
      where: { watermarkId: id }  // Fixed: use destructured 'id' instead of 'params.id'
    })

    if (collectionsUsingWatermark > 0) {
      return NextResponse.json({
        error: 'Cannot delete watermark that is being used by collections'
      }, { status: 400 })
    }

    // Delete file from filesystem
    try {
      const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
      const filePath = path.join(process.cwd(), UPLOAD_DIR, 'watermarks', path.basename(watermark.fileUrl))
      await fs.unlink(filePath)
    } catch (fileError) {
      console.warn('Could not delete watermark file:', fileError)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.watermark.delete({
      where: { id: id }  // Fixed: use destructured 'id' instead of 'params.id'
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Watermark delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}