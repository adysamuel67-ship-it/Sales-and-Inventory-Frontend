'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function MobileCtaBar() {
  const { isAuthenticated, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading || isAuthenticated) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Link
          href="/signup"
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-primary/25"
        >
          Sign Up Free
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}
