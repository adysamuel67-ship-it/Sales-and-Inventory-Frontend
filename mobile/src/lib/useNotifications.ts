import { useState, useEffect, useCallback } from 'react'
import {
  getNotificationsCache,
  getDismissedNotificationIds,
  getReadNotificationIds,
  computeUnreadCount,
} from '@/lib/api'

// Lightweight unread-notification count for badge indicators on entry points
// (dashboard bell, More screen menu row). Uses local cache + read/dismiss state
// so it never hammers the sleeping backend on every render.
export function useUnreadNotifications(businessId: number | undefined): number {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!businessId) {
      setCount(0)
      return
    }
    const [cache, dismissed, read] = await Promise.all([
      getNotificationsCache(),
      getDismissedNotificationIds(),
      getReadNotificationIds(),
    ])
    if (!cache || cache.businessId !== businessId) {
      setCount(0)
      return
    }
    setCount(computeUnreadCount(cache.items, read, dismissed))
  }, [businessId])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [refresh])

  return count
}
