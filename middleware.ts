import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '')

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
console.log('🔍 MIDDLEWARE RUNNING - pathname:', pathname)

  // Solo proteger rutas /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  try {
    // Obtener token de la cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      console.log(`🚫 No auth-token cookie found for ${pathname}`)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar que el token sea válido
    await jwtVerify(token, JWT_SECRET)
    console.log(`✅ Token verified for ${pathname}`)
    return NextResponse.next()
  } catch (error) {
    console.log(`🚫 Token verification failed for ${pathname}:`, error instanceof Error ? error.message : error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/admin/:path*']
}