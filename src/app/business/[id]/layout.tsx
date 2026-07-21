'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { adminAPI } from '@/lib/api'
import DashboardLayout from '@/components/DashboardLayout'

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user, currentBusiness, businesses, fetchBusinesses, switchBusiness, setBusinessRole } = useAuth()
  const businessId = params?.id as string

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user, router])

  useEffect(() => {
    if (isAuthenticated && businesses.length === 0) {
      fetchBusinesses()
    }
  }, [isAuthenticated, businesses.length, fetchBusinesses])

  useEffect(() => {
    if (businessId && businesses.length > 0) {
      const biz = businesses.find((b) => b.business_id === parseInt(businessId))
      if (biz && currentBusiness?.business_id !== biz.business_id) {
        switchBusiness(biz)
      }
    }
  }, [businessId, businesses, currentBusiness, switchBusiness])

  // Fetch business-specific role for the current user
  useEffect(() => {
    if (user?.id && isAuthenticated && profileLoaded && businessId) {
      adminAPI.getMemberByUser(user.id).then((res) => {
        const data = res.data
        let memberRole: string | undefined
        if (Array.isArray(data)) {
          const bizMember = data.find((m: any) => String(m.business_id) === businessId)
          if (bizMember) {
            memberRole = bizMember.role
          } else if (data.length > 0) {
            memberRole = data[0].role
          }
        } else if (data && typeof data === 'object') {
          memberRole = data.role
        }
        if (memberRole) {
          setBusinessRole(memberRole)
        } else if (currentBusiness?.role) {
          setBusinessRole(currentBusiness.role)
        }
      }).catch(() => {
        if (currentBusiness?.role) {
          setBusinessRole(currentBusiness.role)
        }
      })
    }
  }, [user?.id, isAuthenticated, profileLoaded, businessId, setBusinessRole, currentBusiness?.role])

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-light">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && user.is_verified === false) {
    router.replace('/verify')
    return null
  }

  if (!businessId || isNaN(parseInt(businessId))) {
    router.replace('/businesses')
    return null
  }

  if (businesses.length > 0 && !businesses.find((b) => b.business_id === parseInt(businessId))) {
    router.replace('/businesses')
    return null
  }

  return (
    <DashboardLayout businessId={businessId}>
      {children}
    </DashboardLayout>
  )
}
