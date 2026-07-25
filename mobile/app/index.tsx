import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function IndexScreen() {
  const { isAuthenticated, isLoading, isVerified, currentBusiness } = useAuth()
  const router = useRouter()
  const navigated = useRef(false)

  useEffect(() => {
    if (isLoading || navigated.current) return
    navigated.current = true

    if (!isAuthenticated) {
      router.replace('/(auth)/login')
    } else if (!isVerified) {
      router.replace('/(auth)/verify')
    } else if (currentBusiness) {
      router.replace('/(tabs)/dashboard')
    } else {
      router.replace('/(tabs)/more')
    }
  }, [isAuthenticated, isLoading, isVerified, currentBusiness])

  return <LoadingSpinner fullScreen message="Loading..." />
}
