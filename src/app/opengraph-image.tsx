import { ImageResponse } from 'next/og'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site'

export const runtime = 'nodejs'
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #14213D 0%, #1E293B 55%, #0F172A 100%)',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              display: 'flex',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#FFFFFF', fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
              {SITE_NAME}
            </div>
            <div style={{ color: '#94A3B8', fontSize: 19, marginTop: 4 }}>Made in Ghana</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: -1.6,
              maxWidth: 940,
            }}
          >
            Sales &amp; Inventory Tracking for Ghanaian Businesses
          </div>
          <div style={{ color: '#CBD5E1', fontSize: 28, marginTop: 24 }}>
            Record sales, track stock and follow up on debts — free, from any phone.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {['Free to use', 'No credit card', 'Works on any phone'].map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                border: '2px solid rgba(255,255,255,0.25)',
                borderRadius: 999,
                padding: '12px 24px',
                color: '#E2E8F0',
                fontSize: 22,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
