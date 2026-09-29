import type { Metadata } from 'next'
import Link from 'next/link'
import BusinessBotLogo from '@/components/BusinessBotLogo'
import LandingAuthActions from '@/components/LandingAuthActions'
import DashboardPreview from '@/components/landing/DashboardPreview'
import MobileCtaBar from '@/components/landing/MobileCtaBar'
import PhonePreview from '@/components/landing/PhonePreview'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, COMPANY_NAME, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, absoluteUrl } from '@/lib/site'

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

const facts = [
  { value: 'GH₵', label: 'Prices and totals in cedis' },
  { value: 'MoMo', label: 'Mobile money payments recognised' },
  { value: 'Any phone', label: 'Works on a basic Android handset' },
  { value: 'Free', label: 'No card, no setup fee, no trial clock' },
]

const features = [
  {
    n: '01',
    title: 'Record a sale while the customer waits',
    body: 'Pick the product, set the quantity, choose cash or mobile money, and it is done. Stock comes down and revenue goes up in the same tap, so nothing depends on you remembering it later.',
  },
  {
    n: '02',
    title: 'Know what is running out before it runs out',
    body: 'Every sale reduces your inventory automatically. When an item crosses your threshold it surfaces on the dashboard, so you reorder while you still have sales to make — not after.',
  },
  {
    n: '03',
    title: 'Track credit without keeping a notebook',
    body: 'When a customer pays partly, the balance is attached to their name. You see who owes what, when they last paid, and you can send a reminder from the same screen.',
  },
  {
    n: '04',
    title: 'See profit, not just turnover',
    body: 'Money in the till is not the same as money in your pocket. Business Bot GH tracks what you sold against what it cost you, so the reports show what you actually made.',
  },
  {
    n: '05',
    title: 'Put your staff on the system',
    body: 'Add the people who sell for you and give each one a role. They record sales from their own phone, and you keep an eye on the day’s numbers from wherever you are.',
  },
  {
    n: '06',
    title: 'More than one shop or branch',
    body: 'One account holds every business you run, each with its own products, staff and numbers. Switch between them without juggling separate logins.',
  },
]

const steps = [
  { n: '1', title: 'Create your account', body: 'Your name, email and phone number. No card, no sales call, no setup fee.' },
  { n: '2', title: 'Add what you sell', body: 'Products, prices, and how many of each you have in stock right now.' },
  { n: '3', title: 'Start recording', body: 'Log sales as they happen and watch stock, revenue and debts update live.' },
]

const faqs = [
  {
    q: 'Is it really free?',
    a: 'Yes. You can create an account and start recording sales, stock, customers and debts without paying anything, and without entering a card.',
  },
  {
    q: 'Do I need a computer?',
    a: 'No. It works in the browser on any phone, including the basic Android handsets common in Ghana, and it is fine on a slow connection. It also works on tablets and laptops.',
  },
  {
    q: 'What if the internet goes off?',
    a: 'The app is designed for modest connections and does not stream anything heavy. If you lose signal completely, sales you have already saved stay saved.',
  },
  {
    q: 'Can I run more than one business?',
    a: 'Yes. One account can hold several businesses, and each business can have its own members, roles and permissions.',
  },
  {
    q: 'How do I get back in if I forget my password?',
    a: 'Use the "Forgot password" link on the sign-in page and we will email you a link to set a new one.',
  },
  {
    q: 'How do I get help from a real person?',
    a: `Call ${SUPPORT_PHONE_DISPLAY} and someone from ${COMPANY_NAME} will pick up. There is no ticket queue and no chatbot.`,
  },
]

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'GHS' },
    areaServed: 'GH',
    author: { '@type': 'Organization', name: COMPANY_NAME },
    publisher: { '@type': 'Organization', name: COMPANY_NAME },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: `+${SUPPORT_PHONE_TEL.replace(/^\+/, '')}`,
      contactType: 'customer support',
      areaServed: 'GH',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <MobileCtaBar />

      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <BusinessBotLogo size={32} className="shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight text-slate-900">
                {SITE_NAME}
              </span>
              <span className="hidden text-[11px] leading-tight text-slate-500 sm:block">
                {SITE_TAGLINE}
              </span>
            </span>
          </Link>
          <LandingAuthActions />
        </div>
      </header>

      <main className="bg-white">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(20,33,61,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,33,61,.07) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, #000 25%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 80% 55% at 50% 0%, #000 25%, transparent 100%)',
            }}
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-12 text-center sm:px-6 sm:pb-16 sm:pt-20">
            <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 sm:text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span className="truncate">Free to use</span>
              <span className="hidden h-1 w-1 shrink-0 rounded-full bg-slate-300 sm:block" />
              <span className="hidden truncate sm:inline">Built for Ghanaian traders</span>
            </p>

            <h1 className="mx-auto max-w-3xl text-[1.95rem] font-bold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Business Bot GH: Sales &amp; Inventory Tracking for Ghanaian Businesses
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-pretty text-slate-600 sm:mt-6 sm:text-lg">
              Business Bot GH is a free sales and inventory tracking platform built for Ghanaian
              traders, market shops and small businesses. Record sales as they happen, see what is
              left in your stock, follow up on the money you are owed, and know your real profit —
              from the phone already in your pocket.
            </p>

            <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/signup"
                className="rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-dark"
              >
                Create Your Free Account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign In
              </Link>
            </div>

            <p className="mt-5 text-[13px] text-slate-500 sm:text-sm">
              No credit card needed · Set up in two minutes
            </p>
          </div>

          {/* Product */}
          <div className="relative mx-auto max-w-5xl px-3 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:p-4">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ---------- Facts ---------- */}
        <section className="mt-12 border-y border-slate-200 bg-slate-50 sm:mt-0">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:py-12">
            {facts.map((f) => (
              <div key={f.label} className="border-t border-slate-200 pt-4">
                <dt className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {f.value}
                </dt>
                <dd className="mt-1.5 text-[13px] leading-snug text-slate-500">{f.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- Mobile ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-20">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Works the same on any phone
              </p>
              <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
                The shop counter is wherever you are
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-pretty text-slate-600 sm:text-base">
                You do not need a laptop, a desk or a good connection to keep your books straight.
                Open it on the phone in your pocket, ring up a sale, and it is recorded. The same
                numbers you would see on a desktop are waiting when you get home.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-pretty text-slate-600 sm:text-base">
                Built for the handsets most traders in Ghana actually own, and for the network they
                actually have.
              </p>
            </div>
            <div className="flex w-full justify-center lg:w-auto lg:shrink-0">
              <PhonePreview />
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">What it does</p>
              <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
                Six things that used to eat your afternoon
              </h2>
            </div>

            <div className="mt-10 border-t border-slate-200 sm:mt-12">
              {features.map((f) => (
                <div
                  key={f.n}
                  className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-slate-200 py-7 sm:grid-cols-[3rem_1fr] sm:py-8 lg:grid-cols-[4rem_16rem_1fr]"
                >
                  <span className="text-sm font-semibold tabular-nums text-slate-400">{f.n}</span>
                  <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-lg">
                    {f.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-pretty text-slate-600 sm:col-start-2 lg:col-start-3">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Steps ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Getting started</p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Three steps, then you are trading on it
            </h2>
          </div>

          <ol className="mt-10 grid grid-cols-1 gap-8 sm:mt-12 md:grid-cols-3 md:gap-10">
            {steps.map((s) => (
              <li key={s.n} className="border-t-2 border-slate-900 pt-5">
                <span className="text-sm font-bold tabular-nums text-primary">0{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-pretty text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Questions</p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Before you sign up
            </h2>

            <div className="mt-10 border-t border-slate-200">
              {faqs.map((f) => (
                <details key={f.q} className="group border-b border-slate-200 py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold text-slate-900">
                    {f.q}
                    <span className="relative h-3.5 w-3.5 shrink-0" aria-hidden>
                      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-slate-400" />
                      <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-slate-400 transition-transform group-open:scale-y-0" />
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 text-[15px] leading-relaxed text-pretty text-slate-600">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="bg-navy">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <h2 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
              Keep your first sale on it tonight
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-slate-300 sm:text-base">
              Create your free Business Bot GH account and record a sale in the next two minutes.
            </p>
            <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/signup"
                className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-navy transition-colors hover:bg-slate-100"
              >
                Sign Up Free
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/25 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-slate-400 sm:text-sm">No credit card needed</p>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-slate-200 bg-white pb-24 lg:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <BusinessBotLogo size={32} className="shrink-0" />
              <span className="text-sm font-semibold text-slate-900">{SITE_NAME}</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-slate-500">{SITE_TAGLINE}.</p>
            <p className="mt-3 text-[13px] text-slate-400">
              A product of{' '}
              <span className="font-medium text-slate-600">{COMPANY_NAME}</span>
            </p>
            <a
              href={`tel:${SUPPORT_PHONE_TEL}`}
              className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium tabular-nums text-slate-600 transition-colors hover:text-primary"
            >
              <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {SUPPORT_PHONE_DISPLAY}
            </a>
          </div>

          <nav className="-ml-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <Link href="/signup" className="px-2.5 py-2 text-slate-600 transition-colors hover:text-slate-900">
              Sign Up
            </Link>
            <Link href="/login" className="px-2.5 py-2 text-slate-600 transition-colors hover:text-slate-900">
              Sign In
            </Link>
            <Link href="/privacy" className="px-2.5 py-2 text-slate-600 transition-colors hover:text-slate-900">
              Privacy Policy
            </Link>
            <Link href="/terms" className="px-2.5 py-2 text-slate-600 transition-colors hover:text-slate-900">
              Terms of Service
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400 sm:px-6">
            &copy; {new Date().getFullYear()} {COMPANY_NAME}. Made in Ghana.
          </p>
        </div>
      </footer>
    </>
  )
}
