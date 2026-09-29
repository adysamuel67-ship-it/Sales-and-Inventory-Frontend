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
      <nav className="flex items-center gap-2 sm:gap-3" aria-hidden>
        <div className="hidden sm:block h-9 w-16 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-10 w-28 sm:w-36 rounded-lg bg-gray-100 animate-pulse" />
      </nav>
    )
  }

  if (!isAuthenticated) {
    return (
      <nav className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/login"
          className="px-3 sm:px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="px-3 sm:px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm shadow-primary/25"
        >
          Get Started Free
        </Link>
      </nav>
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
    <nav className="flex items-center gap-2 sm:gap-3">
      <span className="hidden lg:block text-sm text-neutral-light max-w-[12rem] truncate">
        {user?.name ? `Hi, ${user.name.split(' ')[0]}` : 'Signed in'}
      </span>
      <button
        type="button"
        onClick={() => router.push(destination)}
        className="px-3 sm:px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm shadow-primary/25"
      >
        Go to Dashboard
      </button>
    </nav>
  )
}
