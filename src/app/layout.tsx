import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { COMPANY_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SUPPORT_PHONE } from '@/lib/site'
import OfflineBanner from '@/components/OfflineBanner'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

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
  colorScheme: 'light',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Free Sales & Inventory Tracking App with Debt & SMS Reminders for Ghana`,
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
    'sales and inventory tracking app',
    'free sales and inventory software Ghana',
    'inventory management system Ghana',
    'pos system Ghana',
    'stock management app',
    'debt tracking software Ghana',
    'credit sales management',
    'SMS debt reminders Ghana',
    'automatic debt collection reminder',
    'business management app Ghana',
    'market shop inventory app',
    'wholesale retail management Ghana',
    'mobile money sales tracking',
    'sales report app Ghana',
    'profit tracking app Ghana',
    'Ghana SME software',
    'small business pos Ghana',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: COMPANY_NAME,
  formatDetection: { telephone: false },
  category: 'business',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Free Sales & Inventory Tracking App with Debt & SMS Reminders for Ghana`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_GH',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Sales, Inventory, Debt Tracking with SMS Reminders`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@businessbotgh',
    creator: '@businessbotgh',
    title: `${SITE_NAME} | Free Sales & Inventory Tracking App with Debt & SMS Reminders for Ghana`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  verification: {
    google: 'oSKW41r6fdiGmV20g0tU6jMjxNmN40NJ4erkj80EmC8',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
}

// Served on every page. The Organization logo is what Google uses for the
// site logo / knowledge-panel treatment in search results; the favicon only
// covers the small icon beside the listing.
const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      alternateName: ['Business Bot Ghana', 'BusinessBot GH'],
      url: `${SITE_URL}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-512.png`,
        width: 512,
        height: 512,
      },
      areaServed: ['GH', 'Ghana'],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: SUPPORT_PHONE,
        contactType: 'customer support',
        areaServed: 'GH',
        availableLanguage: ['English'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web Browser, Android, iOS',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GHS',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150',
      },
      featureList: [
        'Sales Tracking',
        'Inventory Management',
        'Debt Tracking',
        'Automatic SMS Reminders',
        'Customer Management',
        'Profit Reports',
        'Multi-Business Support',
        'Role-Based Access',
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
        <link rel="canonical" href={SITE_URL} />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <AuthProvider>
          <OfflineBanner />
          {children}
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
