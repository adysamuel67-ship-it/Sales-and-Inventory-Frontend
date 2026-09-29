import type { Metadata } from 'next'
import Link from 'next/link'
import BusinessBotLogo from '@/components/BusinessBotLogo'
import LandingAuthActions from '@/components/LandingAuthActions'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: `${SITE_NAME} — Free Sales & Inventory Tracking App for Ghanaian Businesses`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    title: `${SITE_NAME} — Free Sales & Inventory Tracking App for Ghanaian Businesses`,
    description: SITE_DESCRIPTION,
  },
}

const features = [
  {
    title: 'Record every sale in seconds',
    body: 'Log a sale from your phone the moment it happens. Cash, card and mobile money (MTN MoMo, Telecel Cash, AirtelTigo Money) are all supported, so your daily takings are never written on a scrap of paper again.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    ),
  },
  {
    title: 'Know your stock before it runs out',
    body: 'Every sale reduces your stock automatically and you get a low-stock alert when an item is about to finish. Restock a product in a tap and see what is left across every branch you operate.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    ),
  },
  {
    title: 'Stop losing money to unpaid debts',
    body: 'Give credit to a customer, see exactly what they still owe, and get a reminder before they push it to the next week. Your debtors list is always one screen away.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    ),
  },
  {
    title: 'See where your money went',
    body: 'Daily and monthly revenue, best-selling products and profit trends, drawn as simple charts. Export a report and know your real position before you restock.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
  {
    title: 'Bring your staff and your shop online',
    body: 'Add the people who sell for you, give each of them a role, and let them record sales on their own phone while you watch the numbers from yours.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    title: 'Built for Ghanaian trade',
    body: 'Prices and totals in Ghana cedis, mobile money payments recognised, receipt printing, reminders and a built-in chat for your team — all on a connection that does not need to be fast.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5v-1.5m0 0V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v3.75m9.75 0h1.5a2.25 2.25 0 002.25-2.25V6.375c0-.621-.504-1.125-1.125-1.125h-2.25c-.621 0-1.125.504-1.125 1.125v3.75m0 0h.375c.621 0 1.125.504 1.125 1.125v9.375c0 .621-.504 1.125-1.125 1.125h-.375"
      />
    ),
  },
]

const audiences = [
  {
    title: 'Market traders and shop owners',
    body: 'Keep a running record of everything you sell and everything you have left, without a bookkeeper or a desktop computer.',
  },
  {
    title: 'Small retailers and distributors',
    body: 'Watch stock across your branches, spot the products that actually move, and stop tying up cash in items that sit still.',
  },
  {
    title: 'Chandlers, provision and provision stores',
    body: 'Record high-volume daily sales in seconds, including credit given to regular customers, and follow up on what is owed to you.',
  },
  {
    title: 'Growing businesses with staff',
    body: 'Give your team their own login, control what they can change, and check the day\u2019s takings from wherever you are.',
  },
]

const steps = [
  { step: '1', title: 'Create your free account', body: 'Sign up with your name, email and phone number. No card, no setup fee.' },
  { step: '2', title: 'Add your products', body: 'Enter what you sell, your prices and how much of each item you have in stock.' },
  { step: '3', title: 'Start recording sales', body: 'Log each sale as it happens and watch your stock, revenue and debts update instantly.' },
]

const faqs = [
  {
    q: 'Is Business Bot GH really free?',
    a: 'Yes. You can create an account and start recording sales, stock, customers and debts without paying anything and without entering a card.',
  },
  {
    q: 'Do I need a computer to use it?',
    a: 'No. Business Bot GH works on any phone with a browser, including the basic Android phones and feature phones common in Ghana. It also works on tablets and laptops.',
  },
  {
    q: 'Can I use it with more than one shop or branch?',
    a: 'Yes. One account can hold multiple businesses, and each business can have several members with their own roles and permissions.',
  },
  {
    q: 'How do I get my money back if I forget my password?',
    a: 'Use the "Forgot password" link on the sign-in page and we will email you a link to set a new one.',
  },
]

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center mb-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">{eyebrow}</p>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{title}</h2>
    </div>
  )
}

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GHS',
    },
    areaServed: 'GH',
  }

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <BusinessBotLogo size={38} />
            <div>
              <p className="font-semibold text-gray-900 text-[15px] leading-tight">{SITE_NAME}</p>
              <p className="text-[11px] text-neutral-light">{SITE_TAGLINE}</p>
            </div>
          </Link>
          <LandingAuthActions />
        </div>
      </header>

      {/* Hero */}
      <section className="auth-gradient relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <p className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Free to use &middot; Works on any phone
          </p>

          <h1 className="text-white font-bold text-3xl sm:text-5xl tracking-tight leading-tight">
            Business Bot GH: Sales &amp; Inventory Tracking for Ghanaian Businesses
          </h1>

          <p className="text-blue-100 text-base sm:text-lg leading-relaxed mt-6 max-w-2xl mx-auto">
            Business Bot GH is a free sales and inventory tracking platform built for Ghanaian traders,
            market shops and small businesses. Record sales as they happen, track what is left in your
            stock, follow up on customer debts and see your real profit &mdash; all from one dashboard
            that works on the phone already in your pocket.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-primary bg-white rounded-xl hover:bg-blue-50 transition-all shadow-xl shadow-black/20 active:scale-[0.98]"
            >
              Create Your Free Account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>

          <p className="text-blue-200/80 text-sm mt-5">
            No credit card needed &middot; Set up in under two minutes
          </p>
        </div>
      </section>

      {/* Who it is for */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading eyebrow="Who it is for" title="Made for the way small businesses in Ghana actually trade" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {audiences.map((item) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="What it does"
            title="Everything you need to run your shop, in one place"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background rounded-2xl border border-gray-200 p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <SectionHeading eyebrow="Getting started" title="Up and running in three steps" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((item) => (
            <div key={item.step} className="relative bg-white rounded-2xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-full bg-primary text-white font-bold flex items-center justify-center mb-4">
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <SectionHeading eyebrow="Questions" title="Common questions" />

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="bg-background rounded-xl border border-gray-200 px-5 py-4"
              >
                <summary className="cursor-pointer font-semibold text-gray-900 text-sm">
                  {faq.q}
                </summary>
                <p className="text-sm text-gray-600 leading-relaxed mt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Start keeping track of your business today
        </h2>
        <p className="text-gray-600 leading-relaxed mt-4 max-w-xl mx-auto">
          Create your free Business Bot GH account and record your first sale in the next two minutes.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-block px-8 py-4 text-base font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-[0.98]"
          >
            Sign Up Free
          </Link>
        </div>
        <p className="text-sm text-neutral-light mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BusinessBotLogo size={36} />
              <div>
                <p className="text-white font-semibold text-sm">{SITE_NAME}</p>
                <p className="text-xs text-slate-400">{SITE_TAGLINE}</p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <Link href="/signup" className="hover:text-white transition-colors">
                Sign Up
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>
          <p className="text-center sm:text-left text-xs text-slate-500 mt-8 pt-6 border-t border-white/10">
            &copy; {new Date().getFullYear()} {SITE_NAME}. Made in Ghana.
          </p>
        </div>
      </footer>
    </main>
  )
}
