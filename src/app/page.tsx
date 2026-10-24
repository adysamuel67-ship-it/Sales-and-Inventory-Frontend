import type { Metadata } from 'next'
import Link from 'next/link'
import BusinessBotLogo from '@/components/BusinessBotLogo'
import LandingAuthActions from '@/components/LandingAuthActions'
import DashboardPreview from '@/components/landing/DashboardPreview'
import MobileCtaBar from '@/components/landing/MobileCtaBar'
import PhonePreview from '@/components/landing/PhonePreview'
import FeatureGrid from '@/components/landing/FeatureGrid'
import FactCards from '@/components/landing/FactCards'
import DebtLedgerPreview from '@/components/landing/DebtLedgerPreview'
import ProfitChart from '@/components/landing/ProfitChart'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, COMPANY_NAME, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL, absoluteUrl, SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Free Sales, Inventory & Debt Tracking App with SMS Reminders | Business Bot GH',
  description: 'Free sales and inventory tracking app for Ghanaian businesses. Record sales, manage stock, track debts with automatic SMS reminders, customers & profit reports. Works on any phone.',
  keywords: [
    'sales and inventory tracking app Ghana',
    'free inventory management system Ghana',
    'debt tracking with sms reminders',
    'automatic sms reminders Ghana',
    'credit sales management software Ghana',
    'pos system for small business Ghana',
    'stock tracking app Ghana',
    'business management app Ghana free',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Free Sales, Inventory & Debt Tracking App with SMS Reminders | Business Bot GH',
    description: 'Track sales, inventory, debts with automatic SMS reminders. Free for Ghanaian traders & small businesses. Works on any phone.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Business Bot GH - Sales, Inventory & Debt Tracking with SMS Reminders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Sales, Inventory & Debt Tracking App with SMS Reminders | Business Bot GH',
    description: 'Track sales, inventory, debts with automatic SMS reminders. Free for Ghanaian traders & small businesses.',
    images: ['/og-image.png'],
  },
}

const facts = [
  { value: 'GH₵', label: 'Prices and totals in cedis', icon: 'cedi' as const },
  { value: 'MoMo', label: 'Mobile money payments recognised', icon: 'momo' as const },
  { value: 'Any phone', label: 'Works on a basic Android handset', icon: 'phone' as const },
  { value: 'Free', label: 'No card, no setup fee, no trial clock', icon: 'free' as const },
]

// Every user-facing capability the app actually has, taken from the in-app
// navigation: Dashboard, Chat, Sales, Products, Customers, Debts, Reports,
// Notifications, multi-business, plus reminders. Ordered by what closes the
// sale for this audience - the money owed leads, because that is the most
// painful part of running a shop on credit.
const features = [
  {
    n: '01',
    icon: 'ledger' as const,
    title: 'Know exactly who owes you what',
    body: 'Every part payment is attached to the customer, so the balance follows them. See who has gone quiet, how long they have been holding your money, and what they paid last. Track debts with automatic SMS reminders.',
  },
  {
    n: '02',
    icon: 'sale' as const,
    title: 'Record a sale while the customer waits',
    body: 'Search the product, set the quantity, choose cash or mobile money. Stock comes down and revenue goes up in the same tap, so nothing depends on your memory.',
  },
  {
    n: '03',
    icon: 'box' as const,
    title: 'Know what is running out before it runs out',
    body: 'Each sale reduces your inventory automatically. When an item crosses your threshold it surfaces on the dashboard, so you reorder while you still have sales to make.',
  },
  {
    n: '04',
    icon: 'customers' as const,
    title: 'Every customer in one place',
    body: 'Name, phone and full history for everyone who buys from you, with their balance attached. No more digging through a notebook to check who is who.',
  },
  {
    n: '05',
    icon: 'bell' as const,
    title: 'Follow up on debts without the awkwardness',
    body: 'Schedule a reminder against a balance and the message is drafted with the amount and the due date already filled in. Send automatic SMS reminders to collect what you\'re owed.',
  },
  {
    n: '06',
    icon: 'chart' as const,
    title: 'See profit, not just turnover',
    body: 'Money in the till is not the same as money in your pocket. Cost prices are tracked against every product, so reports show what you actually made.',
  },
  {
    n: '07',
    icon: 'chat' as const,
    title: 'Talk to your staff where they already are',
    body: 'Built-in chat means a question about a sale gets answered in minutes, on the same phone they just used to ring it up.',
  },
  {
    n: '08',
    icon: 'team' as const,
    title: 'Put your staff on the system',
    body: 'Give each person a role. They record sales from their own phone, and you keep an eye on the day’s numbers from wherever you happen to be.',
  },
  {
    n: '09',
    icon: 'branch' as const,
    title: 'More than one shop or branch',
    body: 'One account holds every business you run, each with its own products, staff and numbers. Switch between them without juggling separate logins.',
  },
]

// Mirrors the real onboarding order: an account, then a business to hang the
// data off, then products. Skipping the business step used to imply you could
// go straight from signing up to adding stock.
const steps = [
  {
    n: '1',
    title: 'Create your account',
    body: 'Your name, email and phone number. No card, no sales call, no setup fee.',
  },
  {
    n: '2',
    title: 'Create your business',
    body: 'Name the shop you run. Products, staff, sales and debts all live inside it, so adding a second branch later does not mean starting over.',
  },
  {
    n: '3',
    title: 'Add products and start recording',
    body: 'Add what you sell with prices and stock. Then record each sale as it happens and watch stock, revenue and debts update live.',
  },
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
    q: 'How do debt SMS reminders work?',
    a: 'For customers with phone numbers, you can schedule SMS reminders for outstanding debts. The message is pre-filled with the amount and due date. Reminders are sent on the scheduled day and marked as delivered.',
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
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: absoluteUrl('/icon-512.png'),
    image: absoluteUrl('/og-image.png'),
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
    featureList: [
      'Sales Tracking',
      'Inventory Management',
      'Debt Tracking with Automatic SMS Reminders',
      'Customer Management',
      'Profit Reports',
      'Mobile Money Support',
      'Multi-Business Support',
    ],
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
            {/* Positioning only. The price used to be stated here as well as in the
                subhead, the button, the line below it and the proof row -
                five times in one hero. It now appears once, at the CTA. */}
            <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 sm:text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              <span className="truncate">Free Sales & Inventory Tracking for Ghanaian Traders</span>
            </p>

            {/* The headline states the outcome, not the product label - the brand
                name is already in the header logo directly above, and repeating
                it here (and again below) was what made the block feel heavy.
                One phrase carries the accent so the line has a focal point
                instead of reading as a flat slab of grey-blue. */}
            <h1 className="mx-auto max-w-3xl text-balance text-[1.95rem] font-bold leading-[1.1] tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Free Sales & Inventory Tracking{' '}
              <span className="text-primary">with Debt Tracking & SMS Reminders</span>
            </h1>

            {/* Narrower measure than the headline: the classic type hierarchy
                where the headline sets the width and the body copy sits inside
                it. One sentence, brand named once. */}
            <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
              Business Bot GH helps Ghanaian traders record sales, manage stock, track debts with automatic SMS reminders, and see real profit - all from your phone.
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

            {/* Compact proof row, so the claim below the fold is already
                anchored before the reader reaches the facts section. */}
            <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4 border-t border-slate-200 pt-8 sm:gap-8">
              {[
                { k: 'Cedis & MoMo', v: 'Native payment formats' },
                { k: 'Debt + SMS', v: 'Automatic reminders' },
                { k: 'Live Stock', v: 'Updates as you sell' },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="font-display text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    {s.k}
                  </dt>
                  <dd className="mt-1 text-[12px] leading-snug text-slate-500 sm:text-[13px]">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product */}
          <div className="relative mx-auto max-w-5xl px-3 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1.5 sm:p-4">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* The rest of the page continues... */}
