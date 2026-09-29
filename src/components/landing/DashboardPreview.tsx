const NAV = [
  { label: 'Dashboard', active: true },
  { label: 'Sales' },
  { label: 'Products' },
  { label: 'Customers' },
  { label: 'Debts' },
  { label: 'Reports' },
]

const KPIS = [
  { label: 'Revenue', value: 'GH₵ 24,580', delta: '+18%', up: true },
  { label: 'Profit', value: 'GH₵ 6,142', delta: '+11%', up: true },
  { label: 'Sales today', value: '63', delta: '+7', up: true },
  { label: 'Low stock', value: '4', delta: 'action', up: false },
]

const BARS = [38, 52, 44, 61, 49, 72, 58, 84, 66, 91, 74, 88]

const LOW_STOCK = [
  { name: 'Rice 50kg', left: '3 bags', pct: 18 },
  { name: 'Cooking Oil 25L', left: '5 cans', pct: 26 },
  { name: 'Milo 400g', left: '8 tins', pct: 34 },
  { name: 'Indomie (carton)', left: '2', pct: 12 },
]

const SALES = [
  { item: 'Rice 50kg', qty: '×2', total: 'GH₵ 1,200', time: '11:42' },
  { item: 'Cooking Oil 25L', qty: '×1', total: 'GH₵ 285', time: '11:18' },
  { item: 'Milo 400g', qty: '×6', total: 'GH₵ 420', time: '10:55' },
  { item: 'Anker Power Bank', qty: '×3', total: 'GH₵ 510', time: '10:31' },
]

export default function DashboardPreview() {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
      {/* Window bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 sm:px-4 py-2.5">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="w-2 h-2 rounded-full bg-slate-300" />
        </div>
        <div className="mx-auto hidden sm:flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-[10px] text-slate-400 font-medium">businessbotgh.com</span>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2 sm:hidden">
        <span className="flex shrink-0 flex-col gap-[3px]">
          <span className="h-[2px] w-3 rounded-full bg-slate-400" />
          <span className="h-[2px] w-3 rounded-full bg-slate-400" />
          <span className="h-[2px] w-3 rounded-full bg-slate-400" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[9px] font-bold text-slate-800">
          Okafor Provision Store
        </span>
        <span className="h-4 w-4 shrink-0 rounded-full bg-slate-200" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden sm:flex w-[132px] lg:w-[150px] shrink-0 flex-col bg-navy px-2.5 py-3">
          <div className="flex items-center gap-1.5 px-1 mb-4">
            <span className="w-4 h-4 rounded bg-primary shrink-0" />
            <span className="text-[9px] font-semibold text-white truncate">Business Bot</span>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${
                  item.active ? 'bg-white/10 text-white' : 'text-white/40'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm bg-current opacity-50 shrink-0" />
                <span className="text-[9px] font-medium truncate">{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 bg-slate-50/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-800">Dashboard</p>
              <p className="text-[9px] text-slate-400">Okafor Provision Store</p>
            </div>
            <div className="hidden sm:block rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] text-slate-500 font-medium">
              Last 30 days
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <p className="text-[9px] text-slate-400 font-medium truncate">{k.label}</p>
                <p className="text-[12px] sm:text-sm font-bold text-slate-900 mt-0.5 truncate">{k.value}</p>
                <p
                  className={`text-[9px] font-semibold mt-0.5 ${
                    k.up ? 'text-success' : 'text-warning'
                  }`}
                >
                  {k.up ? '↑' : '•'} {k.delta}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
            {/* Chart */}
            <div className="lg:col-span-3 rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[9px] font-semibold text-slate-700 mb-2">Revenue</p>
              <div className="flex items-end gap-[3px] h-[52px] sm:h-[64px]">
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-[2px] ${
                      i === BARS.length - 1 ? 'bg-primary' : 'bg-primary/20'
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Low stock */}
            <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-[9px] font-semibold text-slate-700 mb-2">Low stock</p>
              <div className="space-y-1.5">
                {LOW_STOCK.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[9px] text-slate-600 truncate">{s.name}</span>
                      <span className="text-[9px] text-warning font-semibold shrink-0">{s.left}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100">
                      <div className="h-1 rounded-full bg-warning" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent sales */}
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
            <p className="text-[9px] font-semibold text-slate-700 mb-1.5">Recent sales</p>
            <div className="divide-y divide-slate-100">
              {SALES.map((s, i) => (
                <div
                  key={s.item}
                  className={`flex items-center justify-between gap-2 py-1 ${
                    i > 1 ? 'hidden sm:flex' : ''
                  }`}
                >
                  <span className="text-[9px] text-slate-600 truncate">
                    {s.item} <span className="text-slate-400">{s.qty}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-semibold text-slate-800">{s.total}</span>
                    <span className="text-[9px] text-slate-400">{s.time}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
