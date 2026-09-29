const ITEMS = [
  { name: 'Rice 50kg', price: 600, stock: 3 },
  { name: 'Cooking Oil 25L', price: 285, stock: 5 },
  { name: 'Milo 400g', price: 70, stock: 8 },
  { name: 'Anker Power Bank', price: 170, stock: 12 },
]

export default function PhonePreview() {
  return (
    <div className="w-[232px] sm:w-[248px] shrink-0 rounded-[26px] border border-slate-800 bg-slate-900 p-1.5 shadow-[0_28px_60px_-18px_rgba(15,23,42,0.5)]">
      <div className="rounded-[20px] bg-white overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
          <span className="text-[8px] font-semibold text-slate-700">9:41</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-sm bg-slate-300" />
            <span className="w-1.5 h-1.5 rounded-sm bg-slate-300" />
            <span className="w-3 h-1.5 rounded-sm bg-slate-300" />
          </div>
        </div>

        {/* App bar */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 border-b border-slate-100">
          <span className="w-4 h-4 rounded bg-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-900 leading-none">New Sale</p>
            <p className="text-[7px] text-slate-400 leading-none mt-0.5 truncate">Okafor Provision Store</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-2.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5">
            <span className="w-2 h-2 rounded-full border border-slate-400 shrink-0" />
            <span className="text-[8px] text-slate-400">Search products…</span>
          </div>
        </div>

        {/* Items */}
        <div className="px-3 pt-2 space-y-1">
          {ITEMS.map((it) => (
            <div
              key={it.name}
              className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-100 px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="text-[8px] font-semibold text-slate-800 leading-tight truncate">{it.name}</p>
                <p className="text-[7px] text-slate-400 leading-tight">
                  GH₵ {it.price} · {it.stock} left
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5">
                <span className="text-[8px] font-bold text-primary leading-none">+</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total + pay */}
        <div className="px-3 pt-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] text-slate-500">Total</span>
            <span className="text-[12px] font-bold text-slate-900">GH₵ 1,200</span>
          </div>
          <div className="rounded-lg bg-primary py-1.5 text-center">
            <span className="text-[9px] font-semibold text-white">Charge MoMo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
