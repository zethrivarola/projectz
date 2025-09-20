import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Running authentication debug check...')

    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')
    const cookieToken = request.cookies.get('auth-token')?.value
    const allCookies = request.cookies.getAll()

    const debugInfo = {
      timestamp: new Date().toISOString(),
      headers: {
        authorization: authHeader ? 'Present' : 'Missing',
        userAgent: request.headers.get('user-agent'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      },
      cookies: {
        authTokenPresent: !!cookieToken,
        authTokenValue: cookieToken ? `${cookieToken.substring(0, 20)}...` : null,
        allCookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value }))
      },
      tokens: {
        bearerToken: bearerToken ? `${bearerToken.substring(0, 20)}...` : null,
        cookieToken: cookieToken ? `${cookieToken.substring(0, 20)}...` : null,
        usingToken: bearerToken || cookieToken ? 'Present' : 'Missing'
      }
    }

    const token = bearerToken || cookieToken
    let tokenVerification = null

    if (token) {
      const payload = AuthService.verifyToken(token)
      if (payload) {
        tokenVerification = {
          valid: true,
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
          issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null
        }
      } else {
        tokenVerification = {
          valid: false,
          error: 'Token verification failed'
        }
      }
    }

    console.log('🔧 Debug info generated:', debugInfo)

    return NextResponse.json({
      debug: debugInfo,
      tokenVerification,
      authenticated: !!tokenVerification?.valid
    })

  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Debug endpoint error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
