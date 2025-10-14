import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma' // Asegúrate de tener tu instancia de Prisma

// --- GET: Obtener sesión con selecciones ---
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

   try {
    const session = await prisma.selectionSession.findUnique({
      where: { id: sessionId },
      include: { selections: true }
    })
if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    return NextResponse.json(session)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// --- PATCH: Actualizar o crear selección ---
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = bearerToken || cookieToken

    if (!token) return NextResponse.json({ error: 'No authentication token' }, { status: 401 })

    const payload = AuthService.verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json()
    const { sessionId, photoId, status, comment, rating } = body
    if (!sessionId || !photoId) return NextResponse.json({ error: 'sessionId and photoId are required' }, { status: 400 })

    const session = await prisma.selectionSession.findUnique({
      where: { id: sessionId },
      include: { selections: true }
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.clientId !== payload.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const existingSelection = session.selections.find(s => s.photoId === photoId)
    let updatedSelection
    if (existingSelection) {
      updatedSelection = await prisma.photoSelection.update({
        where: { id: existingSelection.id },
        data: {
          status: status ?? existingSelection.status,
          comment: comment ?? existingSelection.comment,
          rating: rating ?? existingSelection.rating,
          timestamp: new Date()
        }
      })
    } else {
      updatedSelection = await prisma.photoSelection.create({
        data: {
          sessionId,
          photoId,
          clientId: payload.userId,
          status: status ?? 'pending',
          comment,
          rating,
          timestamp: new Date()
        }
      })
    }

    return NextResponse.json({ selection: updatedSelection })
  } catch (error) {
    console.error('PATCH /api/sessions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
