'use client'

import BusinessBotLogo from './BusinessBotLogo'
import AuthIllustration from './AuthIllustration'

interface Feature {
  icon: React.ReactNode
  text: string
}

const features: Feature[] = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    text: 'Track every sale in real time',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    text: 'Manage inventory across branches',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    text: 'Handle customers & debts easily',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    text: 'Generate smart business reports',
  },
]

export default function AuthLayout({
  children,
  title,
  subtitle,
  mode = 'login',
}: {
  children: React.ReactNode
  title: string
  subtitle: string
  mode?: 'login' | 'signup' | 'verify'
}) {
  return (
    <div className="min-h-screen auth-page flex flex-col lg:flex-row">
      {/* Marketing / Hero section — visible on ALL screens */}
      <div className="auth-gradient relative overflow-hidden auth-animate-fade-in lg:w-[55%] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {/* Decorative shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
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

        {/* Mobile layout (visible < lg) */}
        <div className="lg:hidden relative z-10 flex flex-col px-6 pt-8 pb-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 auth-animate-slide-right">
            <BusinessBotLogo size={40} />
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight">Business Bot</h2>
              <p className="text-blue-200 text-xs font-medium">Sales & Inventory Tracking</p>
            </div>
          </div>

          {/* Illustration */}
          <div className="flex justify-center mb-6 auth-animate-fade-up auth-delay-1">
            <div className="auth-animate-float" style={{ maxWidth: '220px' }}>
              <AuthIllustration variant={mode} />
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-6 auth-animate-fade-up auth-delay-2">
            <h1 className="text-white text-xl font-bold leading-tight mb-2">
              {mode === 'signup'
                ? 'Grow Your Business with Smart Tracking'
                : mode === 'verify'
                  ? 'One Step Away from Your Dashboard'
                  : 'Welcome Back to Your Business Hub'}
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed max-w-sm mx-auto">
              {mode === 'signup'
                ? 'Join thousands of market traders managing sales, inventory, and customers — all from one powerful dashboard.'
                : mode === 'verify'
                  ? 'Verify your email to unlock real-time sales tracking, inventory management, and smart reports.'
                  : 'Pick up right where you left off. Your sales, inventory, and reports are all here, updated in real time.'}
            </p>
          </div>

          {/* Features — horizontal scroll on mobile */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory auth-animate-fade-up auth-delay-3 scrollbar-hide">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 shrink-0 snap-start min-w-[200px]"
              >
                <div className="text-blue-200 shrink-0">{feature.icon}</div>
                <span className="text-white text-xs font-medium leading-tight">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop layout (visible lg+) */}
        <div className="hidden lg:flex lg:w-[55%] h-full flex-col justify-between p-10 xl:p-14 relative z-10">
          {/* Top: Logo */}
          <div className="auth-animate-slide-right">
            <div className="flex items-center gap-3 mb-2">
              <BusinessBotLogo size={44} />
              <div>
                <h2 className="text-white font-bold text-xl tracking-tight">Business Bot</h2>
                <p className="text-blue-200 text-xs font-medium">Sales & Inventory Tracking</p>
              </div>
            </div>
          </div>

          {/* Center: Illustration + headline */}
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="auth-animate-float" style={{ maxWidth: '300px' }}>
              <AuthIllustration variant={mode} />
            </div>

            <div className="mt-8 text-center max-w-md auth-animate-fade-up auth-delay-2">
              <h1 className="text-white text-2xl xl:text-3xl font-bold leading-tight mb-3">
                {mode === 'signup'
                  ? 'Grow Your Business with Smart Tracking'
                  : mode === 'verify'
                    ? 'One Step Away from Your Dashboard'
                    : 'Welcome Back to Your Business Hub'}
              </h1>
              <p className="text-blue-100 text-sm leading-relaxed">
                {mode === 'signup'
                  ? 'Join thousands of market traders managing sales, inventory, and customers — all from one powerful dashboard.'
                  : mode === 'verify'
                    ? 'Verify your email to unlock real-time sales tracking, inventory management, and smart reports.'
                    : 'Pick up right where you left off. Your sales, inventory, and reports are all here, updated in real time.'}
              </p>
            </div>
          </div>

          {/* Bottom: Features */}
          <div className="auth-animate-fade-up auth-delay-3">
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10"
                >
                  <div className="text-blue-200 shrink-0">{feature.icon}</div>
                  <span className="text-white text-xs font-medium leading-tight">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background relative">
        <div className="w-full max-w-md auth-animate-fade-up">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 p-8 sm:p-10 border border-gray-100">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-neutral-light mt-1.5 text-sm">{subtitle}</p>
            </div>

            {children}
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-neutral-light mt-6 px-4">
            By continuing, you agree to Business Bot&apos;s{' '}
            <span className="text-primary font-medium cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-primary font-medium cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
