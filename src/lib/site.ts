export const SITE_NAME = 'Business Bot GH'

export const SUPPORTED_COUNTRY_NAMES =
  'Ghana, Nigeria, Kenya, Uganda, Tanzania, South Africa, the United States and the United Kingdom'

export const SITE_TAGLINE = 'Sales, Inventory, Debt Tracking & SMS Reminders for Modern Traders'

export const COMPANY_NAME = 'Whisper Systems'

/**
 * Raw digits, as stored. Kept in full international form (+233 country code,
 * trunk 0 dropped) so it can be handed straight to an SMS provider - the
 * backend's `to_international()` normalises to this same shape before sending.
 */
export const SUPPORT_PHONE = '+233257524704'

/** Grouped for reading on screen, still international. */
export const SUPPORT_PHONE_DISPLAY = '+233 25 752 4704'

/** Dialable from outside Ghana and inside it alike. */
export const SUPPORT_PHONE_TEL = '+233257524704'

export const SUPPORT_EMAIL = 'adysamuel68@gmail.com'

/** Pre-filled mailto so a user can send a report without typing anything. */
export const SUPPORT_EMAIL_SUBJECT = 'Business Bot GH — Support Request'

export const SITE_DESCRIPTION =
  `Business Bot GH is a free sales and inventory tracking platform for traders in ${SUPPORTED_COUNTRY_NAMES}. Record sales, manage stock, track debts with automatic SMS reminders, follow up on customers and see clear profit reports from your phone or laptop.`

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
