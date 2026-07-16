'use client'

import { useAuth } from '@/lib/auth'

export function useBusinessId() {
  const { currentBusiness, businessesLoading } = useAuth()
  return {
    businessId: currentBusiness?.business_id ?? null,
    loading: businessesLoading,
    error: currentBusiness ? '' : businessesLoading ? '' : 'No business selected. Create or join a business first.',
  }
}
