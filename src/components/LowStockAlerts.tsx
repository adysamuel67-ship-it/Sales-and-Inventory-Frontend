'use client'

import { memo } from 'react'
import Link from 'next/link'

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
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Low Stock Alerts</h3>
        {items.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-danger font-medium">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            {items.length} items
          </span>
        )}
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
        <div className="px-5 py-8 text-center">
          <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-neutral-light">All products are well stocked</p>
        </div>
      )}
      <div className="px-5 py-3 border-t border-gray-50">
        <Link href={productsLink} className="text-sm text-primary font-medium hover:underline">
          View All Products &rarr;
        </Link>
      </div>
    </div>
  )
})
