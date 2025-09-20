"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log('🔐 Attempting login for:', email)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      const data = await response.json()
      console.log('✅ Login successful:', data.user)

      // Set token in localStorage as backup
      if (data.token) {
        localStorage.setItem('auth-token', data.token)
        console.log('💾 Token saved to localStorage')
      }

      // Verify authentication immediately
      console.log('🔍 Verifying authentication...')

      // Wait a brief moment for cookie to be properly set
      await new Promise(resolve => setTimeout(resolve, 200))

      const authCheck = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Cache-Control': 'no-cache'
        }
      })

      if (authCheck.ok) {
        const authData = await authCheck.json()
        console.log('✅ Authentication verified:', authData.user.email)
        console.log('🔑 Token info:', authData.tokenInfo)

        // Successful authentication - redirect with page refresh
        console.log('📍 Redirecting to collections...')
        window.location.href = '/collections'
      } else {
        const errorData = await authCheck.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Auth verification failed:', errorData)
        throw new Error(`Authentication verification failed: ${errorData.error}`)
      }

    } catch (error) {
      console.error('❌ Login error:', error)
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const quickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail)
    setPassword(userPassword)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Camera className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">René Rivarola Photography</h1>
              <p className="text-sm text-muted-foreground">Personal Portfolio</p>
            </div>
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your personal photography portfolio
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="your-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-sm text-muted-foreground mb-3">
              Quick Access (click to auto-fill):
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => quickLogin('photographer@demo.com', 'demo123')}
                disabled={isLoading}
              >
                <div>
                  <div className="font-medium">Personal Portfolio</div>
                  <div className="text-xs text-muted-foreground">photographer@demo.com</div>
                </div>
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="text-xs text-muted-foreground">
              Your personal photography portfolio system
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
