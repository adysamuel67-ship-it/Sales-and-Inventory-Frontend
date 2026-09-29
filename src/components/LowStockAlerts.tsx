'use client'

import { memo } from 'react'
import Link from 'next/link'
import Badge from './ui/Badge'

interface LowStockItem {
  name: string
  stock: number
  threshold: number
  unit: string
}

interface Props {
  items: LowStockItem[]
  businessId?: number
}

export default memo(function LowStockAlerts({ items, businessId }: Props) {
  const productsLink = businessId ? `/business/${businessId}/products` : '/products'

  return (
    <section className="surface-card flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-section-title text-slate-900">Low Stock Alerts</h2>
          <p className="mt-0.5 text-xs text-neutral-light">Items at or below their reorder point</p>
        </div>
        {items.length > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <span className="status-dot animate-pulse bg-rose-500" />
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </header>
      {items.length > 0 ? (
        <ul className="flex-1 divide-y divide-slate-100">
          {items.map((item, i) => {
            // Critical when stock is under 30% of the reorder point, warning
            // otherwise. Mirrors the backend's low_stock_threshold semantics.
            const critical = item.stock <= item.threshold * 0.3
            const ratio = item.threshold > 0 ? Math.min(100, (item.stock / item.threshold) * 100) : 0
            return (
              <li key={i} className="px-5 py-3.5 transition-colors hover:bg-surfaceAlt">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-light">
                      {item.stock} {item.unit} remaining (min: {item.threshold})
                    </p>
                    {/* Thin progress rail makes "how far below the line" legible
                        at a glance, which a bare number does not convey. */}
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          critical ? 'bg-danger' : 'bg-warning'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                  <Badge color={critical ? 'rose' : 'amber'}>{item.stock} left</Badge>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-inset ring-emerald-600/20">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-900">All products are well stocked</p>
          <p className="mt-1 text-xs text-neutral-light">Nothing needs restocking right now.</p>
        </div>
      )}
      <footer className="border-t border-slate-200 px-5 py-3.5">
        <Link
          href={productsLink}
          className="group inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:text-primary-dark"
        >
          View All Products
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M18 12H6" />
          </svg>
        </Link>
      </footer>
    </section>
  )
})
