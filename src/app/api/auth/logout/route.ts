// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/logout
 * Limpia las cookies de autenticación y cierra la sesión
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout request received')

    // Limpiar cookie de autenticación si existe
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')

    console.log('✅ Logout successful - cookies cleared')

    return NextResponse.json(
      { 
        success: true,
        message: 'Logged out successfully' 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error during logout:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to logout' 
      },
      { status: 500 }
    )
  }
}
