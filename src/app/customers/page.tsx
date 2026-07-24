'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import NoBusinessGuide from '@/components/NoBusinessGuide'
import { useAuth } from '@/lib/auth'
import { useBusinessId } from '@/lib/useBusinessId'

export default function CustomersTopPage() {
  const { isAuthenticated, isLoading, profileLoaded, user } = useAuth()
  const router = useRouter()
  const { businessId, loading: bizLoading } = useBusinessId()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user?.is_verified, router])

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user && user.is_verified === false) {
    router.replace('/verify')
    return null
  }

  if (!businessId && !bizLoading) {
    return (
      <DashboardLayout>
        <NoBusinessGuide pageName="Customers" />
      </DashboardLayout>
    )
  }

  if (businessId) {
    router.replace(`/business/${businessId}/customers`)
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )
}
