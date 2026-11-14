'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import AppLoadingSplash from '@/components/AppLoadingSplash'

interface StoredUser {
  is_verified?: boolean
}

/**
 * Signed-in visitors should never be left on the marketing page. The auth
 * session lives in localStorage, so the redirect has to happen on the client:
 * hand the visitor straight to the app (or verification, if the account is not
 * verified yet) without waiting for the full profile request.
 */
export default function LandingRedirect() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user, currentBusiness } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [storedToken, setStoredToken] = useState<string | null>(null)
  const [storedBusinessId, setStoredBusinessId] = useState<string | null>(null)
  const [storedUser, setStoredUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    setMounted(true)
    setStoredToken(localStorage.getItem('token'))
    setStoredBusinessId(localStorage.getItem('current_business_id'))
    try {
      const raw = localStorage.getItem('user')
      setStoredUser(raw ? JSON.parse(raw) : null)
    } catch {
      setStoredUser(null)
    }
  }, [])

  const signedIn = isAuthenticated || !!storedToken
  const shouldRedirect = mounted && !isLoading && isAuthenticated
  const effectiveUser = user ?? storedUser
  const verified = effectiveUser ? effectiveUser.is_verified !== false : true

  let destination = '/businesses'
  if (!verified) {
    destination = '/verify'
  } else if (currentBusiness?.business_id) {
    destination = `/business/${currentBusiness.business_id}/dashboard`
  } else if (storedBusinessId) {
    destination = `/business/${storedBusinessId}/dashboard`
  }

  useEffect(() => {
    if (shouldRedirect) router.replace(destination)
  }, [shouldRedirect, destination, router])

  // Keep the marketing page covered from the first client render for anyone
  // who already has a session, instead of briefly flashing it while the
  // profile/business requests settle.
  const showSplash = mounted && signedIn

  if (!showSplash) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <AppLoadingSplash message="Taking you to your dashboard..." />
    </div>
  )
}
