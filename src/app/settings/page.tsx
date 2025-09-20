"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WatermarkManager } from "@/components/watermark-manager"
import {
  Palette,
  Droplets,
  Settings as SettingsIcon,
  Mail,
  Globe,
  Zap,
  Upload,
  Plus
} from "lucide-react"

type SettingsTab = "branding" | "watermark" | "presets" | "email-templates" | "preferences" | "integrations"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("branding")

  const tabs = [
    { id: "branding" as const, label: "Branding", icon: Palette },
    { id: "watermark" as const, label: "Watermark", icon: Droplets },
    { id: "presets" as const, label: "Presets", icon: SettingsIcon },
    { id: "email-templates" as const, label: "Email Templates", icon: Mail },
    { id: "preferences" as const, label: "Preferences", icon: Globe },
    { id: "integrations" as const, label: "Integrations", icon: Zap },
  ]

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          </div>

          {/* Tabs */}
          <div className="flex px-6 gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 text-sm pb-3 transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "watermark" && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Watermark</h2>
                <p className="text-muted-foreground">
                  Protect your photos with custom watermarks. Upload PNG files with transparency for best results.
                </p>
              </div>

              <WatermarkManager />

              {/* Global Watermark Settings */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Apply watermark to web size downloads</CardTitle>
                  <CardDescription>
                    Enable to apply watermark to web size downloads from your collections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                    </div>
                    <span className="text-sm font-medium">On</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "presets" && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Collection Presets</h2>
                <p className="text-muted-foreground">
                  Collection presets allow you to apply default settings when creating a new collection so you don't have to make changes every time.
                </p>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-primary">
                    <Plus className="h-5 w-5" />
                    <span className="font-medium">Add Preset</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "email-templates" && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Email Templates</h2>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Collection Sharing Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-primary mb-2">Wedding Sample Email</h4>
                        <Button variant="ghost" size="sm">⋯</Button>
                      </div>
                      <div>
                        <h4 className="font-medium text-primary mb-2">Newborn Sample Email</h4>
                        <Button variant="ghost" size="sm">⋯</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 text-primary">
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Add Email Template</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Create a custom email template and save time when sharing collections with your clients.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Auto Expiry Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h4 className="font-medium text-primary mb-2">Auto Expiry Reminder</h4>
                      <Button variant="ghost" size="sm">⋯</Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        You can send reminder emails to individual email addresses and/or to client emails that belong to an activity list.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="max-w-4xl space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-2">Preferences</h2>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Filename Display</CardTitle>
                  <CardDescription>
                    You can choose to show / hide your filenames on photos in your collections.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <select className="w-32 p-2 border border-input rounded-md bg-background">
                    <option>Show</option>
                    <option>Hide</option>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Engine Visibility</CardTitle>
                  <CardDescription>
                    Choose whether you want your collections to be searchable on search engines (e.g. Google).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <select className="w-48 p-2 border border-input rounded-md bg-background">
                    <option>Homepage Only</option>
                    <option>All Collections</option>
                    <option>None</option>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sharpening Level</CardTitle>
                  <CardDescription>
                    This setting only applies to web display copies of your photos. Your originals are not altered.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <select className="w-32 p-2 border border-input rounded-md bg-background">
                    <option>Optimal</option>
                    <option>Low</option>
                    <option>High</option>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>RAW Photo Support</CardTitle>
                  <CardDescription>
                    Pro Feature: Enable RAW photos to be included in your galleries alongside other file formats.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-6 bg-muted rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                    </div>
                    <span className="text-sm">Off</span>
                    <Button size="sm" variant="outline" className="ml-4">
                      UPGRADE
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="max-w-4xl space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-2">Integrations</h2>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Lr</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Lightroom Plugin</h3>
                      <p className="text-sm text-muted-foreground">
                        Download the official Pixieset Lightroom Plugin that allows you to upload directly from Lightroom Classic to Pixieset, re-publish new edits easily and sync collections structure for easy organizing.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-primary text-2xl mr-4">→ P</span>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Download Plugin
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center">
                      <span className="text-white font-bold">GA</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Google Analytics</h3>
                      <p className="text-sm text-muted-foreground">
                        Enable Google Analytics on your collections by entering your Google Analytics Tracking ID.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="text-primary">
                      Connect Google Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "branding" && (
            <div className="max-w-4xl space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-2">Branding</h2>
                <p className="text-muted-foreground">
                  Customize your client gallery appearance with your brand colors and logo.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Logo</CardTitle>
                  <CardDescription>
                    Upload your logo to appear in the client gallery header.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Primary Color</CardTitle>
                  <CardDescription>
                    Choose your brand's primary color for buttons and accents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-primary rounded-lg border-2 border-border cursor-pointer"></div>
                    <Input placeholder="#1DB584" className="w-24" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
