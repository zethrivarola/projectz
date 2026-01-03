import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = AuthService.verifyToken(token)
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Solo SUPER_ADMIN puede cambiar contraseñas
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Only SUPER_ADMIN can change passwords' }, { status: 403 })
    }

    const { password } = await request.json()

    // Validar contraseña
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const client = await prisma.user.findUnique({
      where: { id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.role !== 'CLIENT') {
      return NextResponse.json({ error: 'User is not a client' }, { status: 400 })
    }

    // Hash de la nueva contraseña
    const passwordHash = await bcrypt.hash(password, 10)

    // Actualizar contraseña
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    })

    console.log(`✅ Password changed for client: ${client.email}`)

    return NextResponse.json({ 
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    )
  }
}
