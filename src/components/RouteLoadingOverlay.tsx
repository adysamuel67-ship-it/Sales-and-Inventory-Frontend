'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import AppLoadingSplash from '@/components/AppLoadingSplash'

export default function RouteLoadingOverlay() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => setLoading(false), 350)
    return () => clearTimeout(timer)
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999]">
      <AppLoadingSplash message="Loading..." />
    </div>
  )
}
