"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Camera,
  Star,
  Home,
  Settings,
  Grid3x3,
  Upload,
  Share2,
  Download,
  BarChart3,
  Users
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navigationItems: NavItem[] = [
  {
    title: "Collections",
    href: "/collections",
    icon: Grid3x3,
  },
  {
    title: "Starred",
    href: "/starred",
    icon: Star,
  },
  {
    title: "Homepage",
    href: "/homepage",
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
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="w-64 sidebar-nav">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Camera className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">René Rivarola Photography</h1>
            <p className="text-sm text-muted-foreground">Personal Portfolio</p>
          </div>
        </div>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          <span>Storage</span>
        </div>
        <div className="mt-2">
          <div className="text-xs text-muted-foreground">2.67 GB of 3 GB used</div>
          <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{width: "89%"}}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
