import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '')

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  console.log('MIDDLEWARE RUNNING - pathname:', pathname)

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (pathname === '/admin/login') {
    console.log('Allowing access to login page')
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

    if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'PHOTOGRAPHER') {
      console.log('Access denied to', pathname, '- Role', payload.role, 'not allowed')
      
      if (payload.role === 'CLIENT') {
        return NextResponse.redirect(new URL('/', request.url))
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

export const config = {
  matcher: ['/admin/:path*']
}
