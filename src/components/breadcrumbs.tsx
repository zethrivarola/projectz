"use client"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { usePathname } from "next/navigation"

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const pathname = usePathname()
  
  // Detectar si estamos en contexto de cliente o admin
  const isClientContext = pathname.startsWith('/client')
  const homeHref = isClientContext ? '/client/welcome' : '/admin'
  const homeLabel = isClientContext ? 'Home' : 'Admin'
  
  // Si se pasan items manualmente, usarlos directamente SIN agregar home
  // Si no, generar automáticamente y agregar home
  const breadcrumbItems = items || generateBreadcrumbs(pathname)
  const showHome = !items // Solo mostrar home si se generan automáticamente

  return (
    <nav className={`flex items-center gap-2 text-sm ${className}`}>
      {showHome && (
        <Link 
          href={homeHref}
          className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">{homeLabel}</span>
        </Link>
      )}
      
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {(showHome || index > 0) && <ChevronRight className="h-4 w-4 text-slate-400" />}
          {index === breadcrumbItems.length - 1 ? (
            <span className="text-slate-900 font-medium">{item.label}</span>
          ) : (
            <Link 
              href={item.href}
              className="text-slate-600 hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Remove 'admin' or 'client' from segments since we always show Home
  if (segments[0] === 'admin' || segments[0] === 'client') {
    segments.shift()
  }

  let currentPath = pathname.startsWith('/client') ? '/client' : '/admin'

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Format label: capitalize and replace hyphens
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    breadcrumbs.push({
      label,
      href: currentPath
    })
  })

  return breadcrumbs
}
