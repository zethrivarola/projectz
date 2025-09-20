import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Processing logout request...')

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the authentication cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Immediately expire
      path: '/'
    })

    console.log('✅ Logout successful - cookie cleared')

    return response

  } catch (error) {
    console.error('❌ Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
