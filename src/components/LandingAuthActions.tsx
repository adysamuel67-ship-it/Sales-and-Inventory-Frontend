'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function LandingAuthActions() {
  const router = useRouter()
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user, currentBusiness } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="flex shrink-0 items-center gap-2 sm:gap-3" aria-hidden>
        <div className="h-9 w-[3.25rem] rounded-lg bg-slate-100 animate-pulse sm:w-16" />
        <div className="h-9 w-[4.5rem] rounded-lg bg-slate-100 animate-pulse sm:w-36" />
      </div>
    )
  }

  if (!isAuthenticated) {
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

  let destination = '/dashboard'
  if (profileLoaded && user && !isVerified) {
    destination = '/verify'
  } else if (profileLoaded && isVerified && currentBusiness) {
    destination = `/business/${currentBusiness.business_id}/dashboard`
  } else if (profileLoaded && isVerified) {
    destination = '/businesses'
  }

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <span className="hidden max-w-[10rem] truncate text-sm text-slate-500 lg:block">
        {user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Signed in'}
      </span>
      <button
        type="button"
        onClick={() => router.push(destination)}
        className="rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold leading-none text-white shadow-sm shadow-primary/25 transition-colors hover:bg-primary-dark sm:px-5"
      >
        <span className="sm:hidden">Dashboard</span>
        <span className="hidden sm:inline">Go to Dashboard</span>
      </button>
    </div>
  )
}
