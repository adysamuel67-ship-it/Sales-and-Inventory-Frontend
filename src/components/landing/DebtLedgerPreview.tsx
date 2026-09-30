const LEDGER = [
  { name: 'Ama Serwaa', phone: '024 118 5520', owed: 840, last: '2 days ago', age: 12, tone: 'amber' },
  { name: 'Kofi Mensah', phone: '055 402 7719', owed: 1250, last: '6 days ago', age: 21, tone: 'rose' },
  { name: 'Grace Adjei', phone: '020 664 3391', owed: 320, last: 'yesterday', age: 5, tone: 'emerald' },
  { name: 'Ibrahim Ali', phone: '050 917 2246', owed: 1680, last: '9 days ago', age: 30, tone: 'rose' },
]

const PAYMENTS = [
  { name: 'Grace Adjei', amount: 120, when: 'Today, 09:14' },
  { name: 'Ama Serwaa', amount: 200, when: 'Yesterday, 16:02' },
  { name: 'Yaw Boateng', amount: 75, when: 'Yesterday, 11:30' },
]

const TONE_DOT: Record<string, string> = {
  amber: 'bg-warning',
  rose: 'bg-danger',
  emerald: 'bg-success',
}

/**
 * Debt ledger preview.
 *
 * This is the strongest hook for the audience, so it gets a real-looking
 * artefact rather than a bullet point: who owes, how stale the debt is, and
 * what came in today. Copy stays on the ledger itself, which is fully working -
 * SMS reminders are surfaced as something the product schedules, not as a
 * delivery promise.
 */
export default function DebtLedgerPreview() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Owed to you
          </p>
          <p className="font-display text-lg font-bold leading-tight text-slate-900 sm:text-xl">
            GH₵ 4,090
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          4 open
        </span>
      </header>

      {/* Who owes what, with an age rail so staleness is scannable. */}
      <ul className="divide-y divide-slate-100">
        {LEDGER.map((d) => (
          <li key={d.name} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surfaceAlt sm:px-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              {d.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-slate-900">{d.name}</p>
              <p className="truncate text-[11px] text-neutral-light">
                {d.phone} · paid {d.last}
              </p>
              {/* Thin rail: how stale the balance is, at a glance. */}
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${TONE_DOT[d.tone]}`}
                  style={{ width: `${Math.min(100, d.age * 3)}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold tabular-nums text-slate-900">
                GH₵ {d.owed.toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-light">{d.age} days</p>
            </div>
          </li>
        ))}
      </ul>

      <footer className="border-t border-slate-100 bg-surfaceAlt px-4 py-3 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Payments received today
        </p>
        <ul className="mt-1.5 space-y-1">
          {PAYMENTS.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-slate-600">{p.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold tabular-nums text-success">
                  + GH₵ {p.amount}
                </span>
                <span className="text-neutral-light">{p.when}</span>
              </span>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  )
}
