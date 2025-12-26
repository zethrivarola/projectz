'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, Clock, FileArchive, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

const [job, setJob] = useState<{
  id: string;
  status: string;
  progress: number;
  totalPhotos: number;
  zipUrl: string;
  expiresAt: string;
} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/downloads/${token}`);
        
        if (!response.ok) {
          throw new Error('Descarga no encontrada o expirada');
        }

        const data = await response.json();
        setJob(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la descarga');
        setLoading(false);
      }
    };

    fetchJob();
  }, [token]);

  const handleDownload = async () => {
    if (!job || !job.zipUrl) return;

    setDownloading(true);

    try {
      const urls = job.zipUrl.split(',').map((url: string) => url.trim());

      for (let i = 0; i < urls.length; i++) {
        const filename = urls[i].split('/').pop();
        
        // Crear iframe para descarga
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/api/downloads/file/${filename}`;
        document.body.appendChild(iframe);

        // Esperar 3 segundos entre descargas
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Limpiar iframe después de 10 segundos
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (e) {}
        }, 10000);
      }

      setTimeout(() => {
        setDownloading(false);
      }, 5000);

    } catch (err) {
      console.error('Error downloading:', err);
      setDownloading(false);
      alert('Error al iniciar las descargas. Por favor intenta nuevamente.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = job?.expiresAt && new Date(job.expiresAt) < new Date();
  const zipCount = job?.zipUrl ? job.zipUrl.split(',').length : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando descarga...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Descarga no disponible</h1>
          <p className="text-gray-600 mb-6">{error || 'No se encontró la descarga solicitada'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (isExpired || job.status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expirado</h1>
          <p className="text-gray-600 mb-6">
            Este link de descarga expiró el {formatDate(job.expiresAt)}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Los links de descarga expiran automáticamente después de 48 horas por seguridad.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (job.status === 'pending' || job.status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Preparando descarga</h1>
          <p className="text-gray-600 mb-4">Tu descarga aún se está procesando...</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${job.progress || 0}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">{job.progress || 0}% completado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tu descarga está lista</h1>
          <p className="text-gray-600">RENÉ RIVAROLA PHOTOGRAPHY</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Success Banner */}
          <div className="bg-green-50 border-b border-green-100 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Archivos listos para descargar</p>
              <p className="text-sm text-green-700">Los archivos están comprimidos y listos</p>
            </div>
          </div>

          {/* Info */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-gray-600">Total de fotos:</span>
              <span className="font-semibold">{job.totalPhotos || 0}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-gray-600">Archivos ZIP:</span>
              <span className="font-semibold">{zipCount}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-gray-600">Expira:</span>
              <span className="font-semibold text-orange-600">
                {formatDate(job.expiresAt)}
              </span>
            </div>
          </div>

          {/* Download Button */}
          <div className="p-6 bg-gray-50">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Descargando...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Descargar {zipCount > 1 ? `${zipCount} archivos` : 'archivo'}
                </>
              )}
            </button>

            {downloading && (
              <p className="text-sm text-gray-600 text-center mt-3">
                Se descargarán {zipCount} archivos automáticamente con 3 segundos de intervalo
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="p-6 bg-blue-50 border-t border-blue-100">
            <div className="flex gap-3">
              <FileArchive className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">💡 Instrucciones:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Los archivos se descargarán automáticamente</li>
                  <li>• Cada archivo ZIP es independiente</li>
                  <li>• Extrae cada ZIP con la herramienta de tu sistema</li>
                  <li>• Este link expira en 48 horas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Volver a las galerías
          </button>
        </div>
      </div>
    </div>
  );
}
