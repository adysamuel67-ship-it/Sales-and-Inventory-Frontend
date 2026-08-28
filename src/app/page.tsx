'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import BusinessBotLogo from '@/components/BusinessBotLogo'

const highlights = [
  {
    title: 'Real-time sales',
    description: 'Capture every sale as it happens',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: 'Smart inventory',
    description: 'Stay stocked across every branch',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    title: 'Customers & debts',
    description: 'Nothing slips through the cracks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    title: 'Clear reports',
    description: 'Make confident business decisions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
]

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user, currentBusiness } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login')
      } else if (profileLoaded && user && !isVerified) {
        router.replace('/verify')
      } else if (profileLoaded && isVerified && currentBusiness) {
        router.replace(`/business/${currentBusiness.business_id}/dashboard`)
      } else if (profileLoaded && isVerified) {
        router.replace('/businesses')
      }
    }
  }, [isLoading, isAuthenticated, profileLoaded, isVerified, user, currentBusiness, router])

  return (
    <div className="min-h-screen auth-gradient relative overflow-hidden flex items-center justify-center p-6">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -translate-x-1/2" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 41px),
              repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(255,255,255,0.15) 40px, rgba(255,255,255,0.15) 41px)
            `,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl">
        {/* Logo */}
        <div className="relative mb-6 auth-animate-fade-up">
          <div className="absolute inset-0 rounded-3xl bg-white/20 blur-xl auth-animate-pulse-ring" />
          <div className="relative w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center auth-animate-float">
            <BusinessBotLogo size={48} />
          </div>
        </div>

        <h1 className="text-white font-bold text-3xl sm:text-4xl tracking-tight auth-animate-fade-up auth-delay-1">
          Business Bot
        </h1>
        <p className="text-blue-200 text-sm sm:text-base font-medium mt-1.5 auth-animate-fade-up auth-delay-2">
          Sales &amp; Inventory Tracking
        </p>

        {/* Loading indicator */}
        <div className="flex items-center gap-2.5 mt-8 mb-4 auth-animate-fade-up auth-delay-3">
          <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-blue-100 text-sm font-medium">Preparing your workspace...</p>
        </div>
        <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden mb-10 auth-animate-fade-up auth-delay-3">
          <div className="h-full w-1/2 bg-white rounded-full animate-pulse" />
        </div>

        {/* Why the app matters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full auth-animate-fade-up auth-delay-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3.5 border border-white/10 text-left"
            >
              <div className="text-blue-200 shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{item.title}</p>
                <p className="text-blue-100/80 text-xs mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-blue-200/70 text-xs font-medium mt-8 auth-animate-fade-up auth-delay-5">
          Keeping your business on track — sales, stock, and customers in one place.
        </p>
      </div>
    </div>
  )
}