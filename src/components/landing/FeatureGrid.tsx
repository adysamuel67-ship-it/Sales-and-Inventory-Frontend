const ICONS: Record<string, React.ReactNode> = {
  sale: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  ),
  box: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
  ),
  ledger: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
  chart: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  ),
  team: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  ),
  branch: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 012.25-1.016 3.001 3.001 0 003.75.614M3.75 21H2.36m11.14 0H18m0 0h3.64m0 0h1.39M2.25 21h1.5m0 0h3m0 0h5.25m0 0h3" />
  ),
  bell: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  ),
  search: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
  ),
}

const TONE: Record<string, string> = {
  sale: 'bg-primary-light text-primary',
  box: 'bg-emerald-50 text-success',
  ledger: 'bg-amber-50 text-warning',
  chart: 'bg-violet-50 text-violet-600',
  team: 'bg-blue-50 text-blue-600',
  branch: 'bg-slate-100 text-slate-600',
}

export interface Feature {
  n: string
  icon: keyof typeof ICONS
  title: string
  body: string
}

/**
 * Feature cards.
 *
 * A wall of 6 evenly-weighted items gives the reader no way to judge what
 * matters, so each card gets an icon plate, a number, and a hover lift to
 * break up the grid.
 */
export default function FeatureGrid({ features }: { features: Feature[] }) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {features.map((f) => (
        <article
          key={f.n}
          className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover"
        >
          {/* Hairline accent along the top edge on hover - a quieter cue than
              a coloured fill, which would fight the icon plate. */}
          <span
            className="absolute inset-x-0 top-0 h-[3px] scale-x-0 rounded-t-2xl bg-primary transition-transform duration-200 group-hover:scale-x-100"
            aria-hidden="true"
          />

          <div className="flex items-start justify-between gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE[f.icon]}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[f.icon]}
              </svg>
            </div>
            <span className="font-display text-2xl font-bold leading-none text-slate-200 transition-colors duration-200 group-hover:text-primary/30">
              {f.n}
            </span>
          </div>

          <h3 className="mt-4 text-[17px] font-semibold leading-snug tracking-tight text-slate-900">
            {f.title}
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-pretty text-slate-600">{f.body}</p>
        </article>
      ))}
    </div>
  )
}
