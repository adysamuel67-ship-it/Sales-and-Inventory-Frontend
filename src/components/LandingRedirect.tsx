'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import BusinessBotLogo from '@/components/BusinessBotLogo'

export default function LandingRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user, currentBusiness } = useAuth()
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (isAuthenticated) {
      setShowSplash(true)
      if (profileLoaded && user && !isVerified) {
        router.replace('/verify')
      } else if (profileLoaded && isVerified && currentBusiness) {
        router.replace(`/business/${currentBusiness.business_id}/dashboard`)
      } else if (profileLoaded && isVerified) {
        router.replace('/businesses')
      }
    }
  }, [isLoading, isAuthenticated, profileLoaded, isVerified, user, currentBusiness, router])

  return (
    <>
      {children}
      {showSplash && (
        <div className="fixed inset-0 z-50 auth-gradient flex flex-col items-center justify-center p-6">
          <div className="relative mb-6 auth-animate-fade-up">
            <div className="absolute inset-0 rounded-3xl bg-white/20 blur-xl auth-animate-pulse-ring" />
            <div className="relative w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center auth-animate-float">
              <BusinessBotLogo size={48} />
            </div>
          </div>

          <h2 className="text-white font-bold text-2xl tracking-tight auth-animate-fade-up auth-delay-1">
            Business Bot
          </h2>

          <div className="flex items-center gap-2.5 mt-8 mb-4 auth-animate-fade-up auth-delay-2">
            <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-blue-100 text-sm font-medium">Preparing your workspace...</p>
          </div>
          <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden auth-animate-fade-up auth-delay-2">
            <div className="h-full w-1/2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </>
  )
}
