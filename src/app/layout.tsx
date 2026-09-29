import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#14213D',
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
  publisher: SITE_NAME,
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
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
