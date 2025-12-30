import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '')

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('MIDDLEWARE RUNNING - pathname:', pathname)

  // ====== RUTAS DE ADMIN ======
  if (pathname.startsWith('/admin')) {
    // Permitir acceso a login sin autenticación
    if (pathname === '/admin/login') {
      console.log('Allowing access to admin login page')
      return NextResponse.next()
    }

    try {
      const token = request.cookies.get('auth-token')?.value
      if (!token) {
        console.log('No auth-token cookie found for', pathname)
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      const { payload } = await jwtVerify(token, JWT_SECRET)
      console.log('Token verified for', pathname, '- User:', payload.email, '- Role:', payload.role)

      // Solo SUPER_ADMIN y PHOTOGRAPHER pueden acceder a /admin
      if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'PHOTOGRAPHER') {
        console.log('Access denied to', pathname, '- Role', payload.role, 'not allowed')
        
        if (payload.role === 'CLIENT') {
          // Redirigir clientes a su portal
          return NextResponse.redirect(new URL('/client/dashboard', request.url))
        }
        
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      }

      console.log('Access granted to', pathname, '- Role:', payload.role)
      return NextResponse.next()
    } catch (error) {
      console.log('Token verification failed for', pathname, ':', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  // ====== RUTAS DE CLIENT ======
  if (pathname.startsWith('/client')) {
    // Permitir acceso a login sin autenticación
    if (pathname === '/client/login') {
      console.log('Allowing access to client login page')
      return NextResponse.next()
    }

    try {
      const token = request.cookies.get('auth-token')?.value
      if (!token) {
        console.log('No auth-token cookie found for', pathname)
        return NextResponse.redirect(new URL('/client/login', request.url))
      }

      const { payload } = await jwtVerify(token, JWT_SECRET)
      console.log('Token verified for', pathname, '- User:', payload.email, '- Role:', payload.role)

      // Solo CLIENT puede acceder a /client
      if (payload.role !== 'CLIENT') {
        console.log('Access denied to', pathname, '- Role', payload.role, 'not allowed')
        
        // Redirigir admins a su dashboard
        if (payload.role === 'SUPER_ADMIN' || payload.role === 'PHOTOGRAPHER') {
          return NextResponse.redirect(new URL('/admin', request.url))
        }
        
        return NextResponse.json(
          { error: 'Forbidden - Client access required' },
          { status: 403 }
        )
      }

      console.log('Access granted to', pathname, '- Role:', payload.role)
      return NextResponse.next()
    } catch (error) {
      console.log('Token verification failed for', pathname, ':', error instanceof Error ? error.message : 'Unknown error')
      return NextResponse.redirect(new URL('/client/login', request.url))
    }
  }

  // Otras rutas - permitir acceso
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/client/:path*']
}
