'use client'

import { useEffect, useState } from 'react'

/**
 * Fixed top banner shown whenever the browser reports the connection is gone.
 * Appears in every authenticated screen so a trader on a flaky network knows
 * why requests are failing instead of staring at a silent spinner.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] bg-amber-500 text-white text-center text-sm font-medium py-2 px-4 shadow-md"
    >
      You are offline. Saved data is safe — new changes need a connection.
    </div>
  )
}
