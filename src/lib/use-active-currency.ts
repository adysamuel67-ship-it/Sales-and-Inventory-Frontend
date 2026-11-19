'use client'

import { useSyncExternalStore } from 'react'
import { DEFAULT_CURRENCY, getActiveCurrency, subscribe } from '@/lib/currency'

/** Re-renders a component when the active currency changes. */
export function useActiveCurrency(): string {
  return useSyncExternalStore(subscribe, getActiveCurrency, () => DEFAULT_CURRENCY)
}
