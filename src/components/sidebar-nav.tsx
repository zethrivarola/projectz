"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Camera,
  Home,
  Settings,
  Upload,
  BarChart3,
  AlertCircle
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: Home,
  },
  {
    title: "Upload",
    href: "/upload",
    icon: Upload,
  },
  {
    title: "RAW Processing",
    href: "/raw-processing",
    icon: Camera,
  },
  {
    title: "Download Monitor",
    href: "/admin/downloads",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

interface StorageInfo {
  usedGB: number
  maxGB: number
  percentageUsed: number
  availableGB: number
}

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps = {}) {
  const pathname = usePathname()
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStorage()
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchStorage, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStorage() {
    try {
      const token = localStorage.getItem('auth-token')
      const res = await fetch('/api/user/storage', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (res.ok) {
        const data = await res.json()
        setStorage(data)
      }
    } catch (error) {
      console.error('Failed to fetch storage:', error)
    } finally {
      setLoading(false)
    }
  }

  // Determinar color según porcentaje
  function getStorageColor(percentage: number) {
    if (percentage < 70) return 'bg-emerald-500'
    if (percentage < 90) return 'bg-amber-500'
    return 'bg-red-500'
  }

  function getStorageDotColor(percentage: number) {
    if (percentage < 70) return 'bg-emerald-500'
    if (percentage < 90) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-64 sidebar-nav">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
<Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={onNavigate}>
          <Camera className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">René Rivarola</h1>
            <p className="text-sm text-muted-foreground">Photography Admin</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            
            return (
              <li key={item.href}>
<Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "sidebar-nav-item",
                    isActive && "active"
                  )}
                >	
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Storage indicator */}
      <div className="p-4 border-t border-border">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
            <span>Loading storage...</span>
          </div>
        ) : storage ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full", getStorageDotColor(storage.percentageUsed))}></div>
              <span>Storage</span>
              {storage.percentageUsed >= 90 && (
                <AlertCircle className="h-3 w-3 text-red-500 ml-auto" />
              )}
            </div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">
                {storage.usedGB.toFixed(2)} GB of {storage.maxGB} GB used
                <span className="text-muted-foreground/70 ml-1">
                  ({storage.percentageUsed.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 mt-1.5">
                <div 
                  className={cn("h-1.5 rounded-full transition-all", getStorageColor(storage.percentageUsed))}
                  style={{ width: `${Math.min(storage.percentageUsed, 100)}%` }}
                ></div>
              </div>
              {storage.availableGB < 1 && storage.availableGB > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Only {(storage.availableGB * 1024).toFixed(0)} MB left
                </div>
              )}
              {storage.percentageUsed >= 100 && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                  Storage full!
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Storage unavailable</span>
          </div>
        )}
      </div>
    </div>
  )
}
