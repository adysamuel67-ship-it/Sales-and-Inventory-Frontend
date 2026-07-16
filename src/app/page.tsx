'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading, profileLoaded, isVerified } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login')
      } else if (profileLoaded && !isVerified) {
        router.replace('/verify')
      } else if (profileLoaded && isVerified) {
        router.replace('/dashboard')
      }
    }
  }, [isLoading, isAuthenticated, profileLoaded, isVerified, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-light">Loading...</p>
      </div>
    </div>
  )
}
