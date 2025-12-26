// 🔧 CREAR ARCHIVO: /src/app/api/downloads/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/downloads/[jobId] - Consultar status del job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const job = await prisma.downloadJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        progress: true,
        totalPhotos: true,
        totalSize: true,
        zipUrl: true,
        error: true,
        expiresAt: true,
        createdAt: true,
        completedAt: true,
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verificar si expiró
    if (job.status === 'completed' && job.expiresAt && new Date() > job.expiresAt) {
      await prisma.downloadJob.update({
        where: { id: jobId },
        data: { status: 'expired', zipUrl: null }
      })
      
return NextResponse.json({
        ...job,
        status: 'expired',
        zipUrl: null,
        totalSize: job.totalSize ? job.totalSize.toString() : null
      })
    }

    return NextResponse.json({
      ...job,
      totalSize: job.totalSize ? job.totalSize.toString() : null // ✅ FIX: Convertir BigInt
    })

  } catch (error) {
    console.error('❌ Get job status error:', error)
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    )
  }
}
