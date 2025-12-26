// src/app/admin/downloads/page.tsx - CORREGIDO
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Mail,
  HardDrive,
  TrendingUp,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
interface Job {
  id: string;
  status: string;
  progress: number;
  totalPhotos: number;
  totalSize: number | null;
  format: string;
  notificationEmail: string | null;
  emailSent: boolean;
  error: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
  collectionId: string;
}

interface Stats {
  byStatus: Record<string, number>;
  totalCompleted: number;
  totalGBProcessed: number;
  emailsSent: number;
  avgProcessingMinutes: number;
}

export default function AdminDownloadsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
const [filter, setFilter] = useState<string>('active');
  const [cleaningUp, setCleaningUp] = useState(false);

  const fetchData = useCallback(async () => {
    try {
let statusParam = '';
if (filter === 'active') {
  statusParam = '?status=pending,processing';
} else if (filter !== 'all') {
  statusParam = `?status=${filter}`;
}
      const response = await fetch(`/api/admin/downloads${statusParam}`);
      const data = await response.json();
      
      setJobs(data.jobs);
      setStats(data.stats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

const handleCleanup = async (type: 'expired' | 'completed' | 'all') => {
const confirmMessage = type === 'expired' 
  ? '¿Limpiar todos los archivos expirados?'
  : type === 'completed'
  ? '⚠️ ¿Limpiar TODOS los archivos completados?\n\nEsto eliminará todos los ZIPs descargables.\n\n¿Estás seguro?'
  : '🚨 ¿LIMPIAR TODO?\n\nEsto eliminará:\n- Todos los expirados\n- Todos los fallidos\n- Todos los completados\n\n⚠️ Irreversible.\n\n¿Seguro?';  
  if (!confirm(confirmMessage)) return;
  
  setCleaningUp(true);
  try {
    const response = await fetch('/api/admin/downloads/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await response.json();
    
    alert(`Limpieza completada:\n- ${data.jobsExpired} jobs limpiados\n- ${data.filesDeleted} archivos eliminados`);
    fetchData();
  } catch (error) {
    alert('Error al limpiar archivos');
  } finally {
    setCleaningUp(false);
  }
};
  const handleCancelJob = async (jobId: string) => {
    if (!confirm('¿Cancelar este job?')) return;
    
    try {
      await fetch(`/api/admin/downloads?jobId=${jobId}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      alert('Error al cancelar job');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'expired': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Download Jobs Monitor</h1>
    <p className="text-gray-600">Monitorea y gestiona todos los trabajos de descarga</p>
  </div>
  <Link href="/admin">
    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Volver al Dashboard
    </button>
  </Link>
</div>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Completados</p>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCompleted}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">GB Procesados</p>
                <HardDrive className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalGBProcessed}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Emails Enviados</p>
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.emailsSent}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Tiempo Promedio</p>
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.avgProcessingMinutes}m</p>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div className="flex gap-2">
<button
  onClick={() => setFilter('active')}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    filter === 'active' 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  Activos ({(stats?.byStatus?.pending || 0) + (stats?.byStatus?.processing || 0)})
</button>
<button
  onClick={() => setFilter('all')}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    filter === 'all' 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  Todos ({stats?.byStatus ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0})
</button>
<button
  onClick={() => setFilter('completed')}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    filter === 'completed' 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  Completados ({stats?.byStatus?.completed || 0})
</button>
<button
  onClick={() => setFilter('failed')}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    filter === 'failed' 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  Fallidos ({stats?.byStatus?.failed || 0})
</button>
<button
  onClick={() => setFilter('expired')}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    filter === 'expired' 
      ? 'bg-blue-600 text-white' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  Expirados ({stats?.byStatus?.expired || 0})
</button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refrescar
            </button>
<button
  onClick={() => handleCleanup('expired')}
  disabled={cleaningUp}
  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:bg-gray-400"
>
  {cleaningUp ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
  Limpiar Expirados
</button>
<button
  onClick={() => handleCleanup('completed')}
  disabled={cleaningUp}
  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:bg-gray-400"
>
  {cleaningUp ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
  Limpiar Completados
</button>
<button
  onClick={() => handleCleanup('all')}
  disabled={cleaningUp}
  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:bg-gray-400"
>
  {cleaningUp ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
  Limpiar Todo
</button>  

        </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fotos / Tamaño
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expira
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {job.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{job.totalPhotos} fotos</div>
                      <div className="text-sm text-gray-500">{formatBytes(job.totalSize)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {job.emailSent && <Mail className="h-4 w-4 text-green-600" />}
                        <span className="text-sm text-gray-900">
                          {job.notificationEmail || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.expiresAt ? formatDate(job.expiresAt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {(job.status === 'pending' || job.status === 'processing') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-12">
              <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay jobs para mostrar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
