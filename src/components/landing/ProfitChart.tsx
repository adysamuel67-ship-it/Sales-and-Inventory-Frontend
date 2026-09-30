// Weekly figures, revenue against profit. The gap between the two filled areas
// is the cost of goods, which is the thing the copy is actually claiming the
// product makes visible.
const WEEK = [
  { label: 'Mon', revenue: 3200, profit: 900 },
  { label: 'Tue', revenue: 4100, profit: 1180 },
  { label: 'Wed', revenue: 2800, profit: 720 },
  { label: 'Thu', revenue: 5200, profit: 1640 },
  { label: 'Fri', revenue: 4600, profit: 1290 },
  { label: 'Sat', revenue: 6100, profit: 1980 },
  { label: 'Sun', revenue: 3900, profit: 980 },
]

const MAX = Math.max(...WEEK.map((d) => d.revenue))

export default function ProfitChart() {
  const totalRevenue = WEEK.reduce((s, d) => s + d.revenue, 0)
  const totalProfit = WEEK.reduce((s, d) => s + d.profit, 0)
  const margin = Math.round((totalProfit / totalRevenue) * 100)

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            This week
          </p>
          <p className="font-display text-xl font-bold leading-tight text-slate-900">
            GH₵ {totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-slate-400">Profit</p>
            <p className="text-sm font-semibold tabular-nums text-success">
              GH₵ {totalProfit.toLocaleString()}
            </p>
          </div>
          <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            {margin}% margin
          </div>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-5">
        {/* Grouped bars: revenue in a soft tint, profit in solid accent, so the
            margin is visible as a shape rather than stated as a number. */}
        <div className="flex h-36 items-end gap-2 sm:h-44 sm:gap-3">
          {WEEK.map((d) => (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div
                  className="w-full max-w-[18px] rounded-t bg-primary/20 transition-all duration-300"
                  style={{ height: `${(d.revenue / MAX) * 100}%` }}
                  title={`Revenue GH₵ ${d.revenue.toLocaleString()}`}
                />
                <div
                  className="w-full max-w-[18px] rounded-t bg-primary transition-all duration-300"
                  style={{ height: `${(d.profit / MAX) * 100}%` }}
                  title={`Profit GH₵ ${d.profit.toLocaleString()}`}
                />
              </div>
              <span className="text-[10px] font-medium text-neutral-light">{d.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary/20" />
            Turnover
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            What you actually made
          </span>
        </div>
      </div>
    </div>
  )
}
