export const SITE_NAME = 'Business Bot GH'

export const SITE_TAGLINE = 'Sales & Inventory Tracking for Ghanaian Businesses'

export const SITE_DESCRIPTION =
  'Business Bot GH is a free sales and inventory tracking platform built for Ghanaian traders, market shops and small businesses. Record sales, manage stock, follow up on debts and see clear profit reports from your phone or laptop.'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/+$/, '')

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
