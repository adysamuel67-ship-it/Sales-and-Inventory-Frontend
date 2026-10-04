/**
 * Baseline security response headers applied to every route.
 * Kept deliberately conservative: no CSP here, since the app renders
 * Next.js inline bootstrap scripts that a strict policy would break.
 */
const securityHeaders = [
  // Stops browsers MIME-sniffing a response away from its declared type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Blocks clickjacking via cross-origin framing.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Only send the full referrer to this same origin.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // HSTS: force HTTPS for two years, subdomains included.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Opt out of unused browser features.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
]

const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
