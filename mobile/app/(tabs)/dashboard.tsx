import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardTab() {
  const { currentBusiness } = useAuth()
  const router = useRouter()
  const navigated = useRef(false)

  useEffect(() => {
    if (currentBusiness && !navigated.current) {
      navigated.current = true
      router.replace(`/business/${currentBusiness.business_id}/dashboard`)
    }
  }, [currentBusiness])

  return <LoadingSpinner fullScreen message="Loading dashboard..." />
}
