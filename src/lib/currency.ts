/**
 * Currency handling.
 *
 * Amounts come from the API as plain numbers; the currency they are expressed
 * in is a property of the signed-in user's profile (`currency`, derived from
 * their `country_code`). Nothing in the UI may hardcode a currency symbol -
 * every formatted amount goes through `formatMoney`, which reads the active
 * currency and lets `Intl.NumberFormat` render it for the user's locale.
 */

export const DEFAULT_CURRENCY = 'GHS'

/** Country assumed when the profile carries none (matches the backend). */
export const DEFAULT_COUNTRY_CODE = 'GH'

/** Mirrors the backend mapping in `src/users/schemas.py`. */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  GH: 'GHS',
  NG: 'NGN',
  KE: 'KES',
  UG: 'UGX',
  TZ: 'TZS',
  ZA: 'ZAR',
  US: 'USD',
  GB: 'GBP',
}

/** The countries a user can pick, paired with the currency they map to. */
export const COUNTRY_OPTIONS: { code: string; name: string; label: string; currency: string }[] = [
  { code: 'GH', name: 'Ghana', label: 'Ghana', currency: 'GHS' },
  { code: 'NG', name: 'Nigeria', label: 'Nigeria', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', label: 'Kenya', currency: 'KES' },
  { code: 'UG', name: 'Uganda', label: 'Uganda', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', label: 'Tanzania', currency: 'TZS' },
  { code: 'ZA', name: 'South Africa', label: 'South Africa', currency: 'ZAR' },
  { code: 'US', name: 'United States', label: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', label: 'United Kingdom', currency: 'GBP' },
]

export const SUPPORTED_COUNTRIES = COUNTRY_OPTIONS

export function currencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return DEFAULT_CURRENCY
  return COUNTRY_TO_CURRENCY[String(countryCode).trim().toUpperCase()] || DEFAULT_CURRENCY
}

export function normalizeCurrency(code?: string | null): string {
  const upper = String(code ?? '').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(upper) ? upper : DEFAULT_CURRENCY
}

const STORAGE_KEY = 'active_currency'
const listeners = new Set<() => void>()

let activeCurrency = DEFAULT_CURRENCY
let hydrated = false

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) activeCurrency = normalizeCurrency(stored)
  } catch {
    // localStorage unavailable (private mode) - keep the default.
  }
}

export function getActiveCurrency(): string {
  hydrate()
  return activeCurrency
}

/** The currency persisted for this browser, before any profile has loaded. */
export function getStoredCurrency(): string {
  return getActiveCurrency()
}

export function setActiveCurrency(code?: string | null) {
  const next = normalizeCurrency(code)
  if (next === activeCurrency) return
  activeCurrency = next
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore quota / private-mode errors
    }
  }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The currency symbol/code rendered by `Intl` for a currency, for input labels. */
export function currencyLabel(code?: string | null): string {
  const currency = normalizeCurrency(code ?? getActiveCurrency())
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/**
 * Formats an amount in the active currency using the user's locale.
 *
 * When `fractionDigits` is omitted, `Intl` picks the currency's own minor unit
 * (2 for GHS/USD, 0 for UGX), so a zero-decimal currency is not shown with
 * fake cents.
 */
export function formatMoney(
  value: number | string | null | undefined,
  fractionDigits?: number
): string {
  const num = Number(value ?? 0)
  const safe = Number.isFinite(num) ? num : 0

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: getActiveCurrency(),
  }
  if (fractionDigits != null) {
    options.minimumFractionDigits = fractionDigits
    options.maximumFractionDigits = fractionDigits
  }

  try {
    return new Intl.NumberFormat(undefined, options).format(safe)
  } catch {
    return safe.toFixed(fractionDigits ?? 2)
  }
}
