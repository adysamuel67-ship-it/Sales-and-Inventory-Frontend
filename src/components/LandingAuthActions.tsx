'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import AppLoadingSplash from '@/components/AppLoadingSplash'

export default function LandingAuthActions() {
  const router = useRouter()
  const { isAuthenticated, isLoading, profileLoaded, user, currentBusiness, businessesLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  let destination = '/dashboard'
  if (profileLoaded && user?.is_verified === false) {
    destination = '/verify'
  } else if (profileLoaded && currentBusiness) {
    destination = `/business/${currentBusiness.business_id}/dashboard`
  } else if (profileLoaded) {
    destination = '/businesses'
  }

  useEffect(() => {
    if (!mounted || isLoading || !isAuthenticated || !profileLoaded || businessesLoading) return
    router.replace(destination)
  }, [mounted, isLoading, isAuthenticated, profileLoaded, businessesLoading, destination, router])

  if (!mounted || isLoading) {
    return (
      <div className="flex shrink-0 items-center gap-2 sm:gap-3" aria-hidden>
        <div className="h-9 w-[3.25rem] rounded-lg bg-slate-100 animate-pulse sm:w-16" />
        <div className="h-9 w-[4.5rem] rounded-lg bg-slate-100 animate-pulse sm:w-36" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <AppLoadingSplash message="Taking you to your workspace..." />
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-primary sm:px-4"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold leading-none text-white shadow-sm shadow-primary/25 transition-colors hover:bg-primary-dark sm:px-5"
      >
        <span className="sm:hidden">Sign Up</span>
        <span className="hidden sm:inline">Get Started Free</span>
      </Link>
    </div>
  )
}
