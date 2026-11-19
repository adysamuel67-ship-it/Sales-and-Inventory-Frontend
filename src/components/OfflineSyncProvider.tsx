'use client'

import { useEffect } from 'react'
import { flushOutbox, startOfflineSync } from '@/lib/offlineSync'

export default function OfflineSyncProvider() {
  useEffect(() => {
    const stop = startOfflineSync()
    void flushOutbox()
    return stop
  }, [])

  return null
}
