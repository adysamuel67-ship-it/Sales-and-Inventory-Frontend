'use client'

import Link from 'next/link'

interface LowStockItem {
  name: string
  stock: number
  threshold: number
  unit: string
}

interface Props {
  items: LowStockItem[]
}

export default function LowStockAlerts({ items }: Props) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Low Stock Alerts</h3>
        <span className="flex items-center gap-1.5 text-xs text-danger font-medium">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          {items.length} items
        </span>
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-gray-50">
          {items.map((item, i) => {
            const urgency = item.stock <= item.threshold * 0.3 ? 'danger' : 'warning'
            return (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-neutral-light mt-0.5">
                    {item.stock} {item.unit} remaining (min: {item.threshold})
                  </p>
                </div>
                <span
                  className={`ml-3 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    urgency === 'danger'
                      ? 'bg-danger-light text-danger'
                      : 'bg-warning-light text-warning'
                  }`}
                >
                  {item.stock} left
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-neutral-light text-sm">
          All products are well stocked
        </div>
      )}
      <div className="px-5 py-3 border-t border-gray-50">
        <Link href="/products" className="text-sm text-primary font-medium hover:underline">
          View All Products →
        </Link>
      </div>
    </div>
  )
}
