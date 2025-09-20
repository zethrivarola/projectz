"use client"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Star, Camera } from "lucide-react"

export default function StarredPage() {
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-foreground">Starred</h1>
          </div>

          {/* Tabs */}
          <div className="flex px-6">
            <div className="flex items-center gap-1 text-sm border-b-2 border-primary pb-3 text-primary">
              Collections
            </div>
            <div className="flex items-center gap-1 text-sm pb-3 px-6 text-muted-foreground hover:text-foreground cursor-pointer">
              Photos
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
                <path d="M12 2L14.09 8.26L20 9L15 14L16.18 20L12 17.27L7.82 20L9 14L4 9L9.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <path d="M8 15L12 18L16 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">You have no starred collections yet</h2>
            <p className="text-muted-foreground mb-6">Track your favorite collections with stars.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
