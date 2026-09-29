import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/business/',
          '/businesses/',
          '/customers/',
          '/dashboard/',
          '/debts/',
          '/products/',
          '/profile/',
          '/sales/',
          '/settings/',
          '/verify/',
          '/forgot-password',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
