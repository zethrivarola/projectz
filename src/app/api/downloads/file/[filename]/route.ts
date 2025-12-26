import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/media/storage/rene-rivarola/uploads';
const TEMP_DOWNLOAD_DIR = path.join(UPLOAD_DIR, 'temp-downloads');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const params = await context.params;
    const filename = params.filename;
    
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

// Verificar que el job no haya expirado
    const jobFilename = filename.split('-part')[0]; // Obtener nombre base sin "partX.zip"
    
    const job = await prisma.downloadJob.findFirst({
      where: {
        zipUrl: {
          contains: filename
        }
      },
      select: {
        expiresAt: true,
        status: true
      }
    });

    if (job) {
      // Verificar expiración
      if (job.expiresAt && new Date() > job.expiresAt) {
        console.log(`Download expired: ${filename}`);
        return NextResponse.json(
          { error: 'This download link has expired. Please generate a new download.' },
          { status: 410 } // 410 Gone
        );
      }

      // Verificar que el job esté completado
      if (job.status !== 'completed') {
        return NextResponse.json(
          { error: 'Download not ready yet' },
          { status: 404 }
        );
      }
    }


    const filePath = path.join(TEMP_DOWNLOAD_DIR, filename);
    
    let stats;
    try {
      stats = statSync(filePath);
    } catch (error) {
      console.error(`File not found: ${filePath}`);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileSize = stats.size;
    console.log(`Streaming file: ${filename} (${formatBytes(fileSize)})`);

    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
    });

    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      console.log(`Range request: ${start}-${end}/${fileSize}`);

      const fileStream = createReadStream(filePath, { start, end });
const stream = Readable.toWeb(fileStream);
      return new NextResponse(stream as unknown as BodyInit, {
        status: 206,
        headers: {
          ...Object.fromEntries(headers),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize.toString(),
        },
      });
    }

    const fileStream = createReadStream(filePath);
const stream = Readable.toWeb(fileStream);
    return new NextResponse(stream as unknown as BodyInit, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Download file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
