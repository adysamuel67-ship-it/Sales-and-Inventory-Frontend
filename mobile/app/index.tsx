import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
      AsyncStorage.getItem('has_seen_onboarding').then((seen) => {
        if (seen === 'true') {
          router.replace('/(auth)/login')
        } else {
          router.replace('/(auth)/onboarding')
        }
      })
    } else if (!isVerified) {
      router.replace('/(auth)/verify')
    } else if (currentBusiness) {
      router.replace('/(tabs)/dashboard')
    } else {
      router.replace('/more')
    }
  }, [isAuthenticated, isLoading, isVerified, currentBusiness])

  return <LoadingSpinner fullScreen message="Loading..." />
}
