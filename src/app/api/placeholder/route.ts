import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const width = parseInt(searchParams.get('width') || '300')
    const height = parseInt(searchParams.get('height') || '400')
    const text = searchParams.get('text') || 'Image'

    // Create SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f1f5f9"/>
        <rect x="10" y="10" width="${width - 20}" height="${height - 20}" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="5,5"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="system-ui, sans-serif" font-size="16" fill="#64748b">${text}</text>
      </svg>
    `

    // Convert SVG to PNG
    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    })

  } catch (error) {
    console.error('Placeholder generation error:', error)
    return NextResponse.json({ error: 'Failed to generate placeholder' }, { status: 500 })
  }
}
