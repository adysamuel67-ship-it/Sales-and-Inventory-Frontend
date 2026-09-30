export const SITE_NAME = 'Business Bot GH'

export const SITE_TAGLINE = 'Sales & Inventory Tracking for Ghanaian Businesses'

export const COMPANY_NAME = 'Whisper Systems'

/** Raw digits, as stored. */
export const SUPPORT_PHONE = '0257524704'

/** Grouped for reading on screen. */
export const SUPPORT_PHONE_DISPLAY = '0257 524 704'

/** Dialable from outside Ghana (country code 233, trunk 0 dropped). */
export const SUPPORT_PHONE_TEL = '+233257524704'

export const SUPPORT_EMAIL = 'adysamuel68@gmail.com'

/** Pre-filled mailto so a user can send a report without typing anything. */
export const SUPPORT_EMAIL_SUBJECT = 'Business Bot GH — Support Request'

export const SITE_DESCRIPTION =
  'Business Bot GH is a free sales and inventory tracking platform built for Ghanaian traders, market shops and small businesses. Record sales, manage stock, follow up on debts and see clear profit reports from your phone or laptop.'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
