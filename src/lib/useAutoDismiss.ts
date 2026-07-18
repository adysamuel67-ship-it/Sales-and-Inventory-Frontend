'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useAutoDismiss(message: string | null, delay = 4000) {
  const [visible, setVisible] = useState(!!message)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (message) {
      setVisible(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setVisible(false)
      }, delay)
    } else {
      setVisible(false)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [message, delay])

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  return { visible, dismiss }
}
