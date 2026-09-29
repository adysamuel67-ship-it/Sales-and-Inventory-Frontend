import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { COMPANY_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

// Self-hosted at build time by next/font: no render-blocking request to a
// third-party CDN, no FOUT, and no silent fallback to the OS system stack.
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

// Distinct display face for page titles / section headers so hierarchy reads
// as deliberate typography rather than bold-and-bigger.
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800'],
  variable: '--font-display',
})

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Sales & Inventory Tracking for Ghanaian Businesses`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  keywords: [
    'sales tracking app Ghana',
    'inventory management Ghana',
    'stock management software',
    'point of sale Ghana',
    'business management app',
    'Ghana SME software',
    'mobile money sales tracking',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: COMPANY_NAME,
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Sales & Inventory Tracking for Ghanaian Businesses`,
    description: SITE_DESCRIPTION,
    url: '/',
    locale: 'en_GH',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Sales & Inventory Tracking for Ghanaian Businesses`,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: 'oSKW41r6fdiGmV20g0tU6jMjxNmN40NJ4erkj80EmC8',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
