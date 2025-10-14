import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  const filePath = path.join(process.cwd(), 'uploads', ...resolvedParams.path)

  // Si no existe, devuelve error 404
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  // Lee el archivo
  const buffer = fs.readFileSync(filePath)

  // Determina tipo de contenido según extensión
  const ext = path.extname(filePath).toLowerCase()
  const contentType = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  }[ext] || 'application/octet-stream'

  // Devuelve el archivo
  return new NextResponse(buffer, {
    status: 200,
    headers: { 'Content-Type': contentType }
  })
}
