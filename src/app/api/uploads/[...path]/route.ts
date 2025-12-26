import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params
  
  // Usar la ruta correcta desde .env
  const uploadDir = process.env.UPLOAD_DIR || '/media/storage/rene-rivarola/uploads'
  const filePath = path.join(uploadDir, ...resolvedParams.path)
  
  // Si no existe, devuelve error 404
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`)
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
    headers: { 
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  })
}
