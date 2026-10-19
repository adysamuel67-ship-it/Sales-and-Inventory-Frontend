'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker in production only. Dev builds skip it so the
 * cache never shadows hot-reloaded modules.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return null
}
