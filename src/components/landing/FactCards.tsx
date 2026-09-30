/**
 * Trust facts as cards rather than a bare stat strip.
 *
 * Each fact gets an icon plate and a hairline top rule so the row reads as four
 * deliberate tiles instead of a table of numbers competing with the hero.
 */
const ICONS: Record<string, React.ReactNode> = {
  cedi: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.706 7.459a4.5 4.5 0 01-5.177 5.772L4.5 18.75l-.75-.75 4.519-5.029a4.5 4.5 0 015.437-5.443zm0 0l1.5-1.5m0 0l3 3m-3-3l-3-3m-1.5 1.5L12 6m0 0l3 3" />
  ),
  momo: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
  ),
  phone: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  ),
  free: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
}

const TONE: Record<string, string> = {
  cedi: 'bg-primary-light text-primary',
  momo: 'bg-emerald-50 text-success',
  phone: 'bg-amber-50 text-warning',
  free: 'bg-violet-50 text-violet-600',
}

export interface Fact {
  value: string
  label: string
  icon: keyof typeof ICONS
}

export default function FactCards({ facts }: { facts: Fact[] }) {
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
      {facts.map((f) => (
        <div
          key={f.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONE[f.icon]}`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[f.icon]}
            </svg>
          </div>
          <dt className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900">
            {f.value}
          </dt>
          <dd className="mt-1.5 text-[13px] leading-snug text-slate-500">{f.label}</dd>
        </div>
      ))}
    </dl>
  )
}
