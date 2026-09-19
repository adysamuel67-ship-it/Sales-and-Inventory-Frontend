'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getUserIdFromToken } from '@/lib/api'
import ChatRoom from '@/components/chat/ChatRoom'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, currentBusiness } = useAuth()
  const businessId = parseInt(params?.id as string, 10)

  useEffect(() => {
    if (!user && !currentBusiness) router.replace('/login')
  }, [user, currentBusiness, router])

  if (isNaN(businessId)) {
    return null
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(`/business/${businessId}/dashboard`)
    }
  }

  return (
    <ChatRoom
      businessId={businessId}
      businessName={currentBusiness?.name}
      selfUserId={user?.id ?? getUserIdFromToken()}
      fullScreen
      onBack={handleBack}
    />
  )
}