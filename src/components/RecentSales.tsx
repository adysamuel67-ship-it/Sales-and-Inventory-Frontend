'use client'

import { useState, useMemo, memo } from 'react'
import Link from 'next/link'
import SaleDetailModal from './SaleDetailModal'
import { MappedSale } from '@/lib/utils'

type SaleRecord = MappedSale

interface Props {
  sales: SaleRecord[]
  businessId?: number
}

const paymentColors: Record<string, string> = {
  Cash: 'bg-success-light text-success',
  MoMo: 'bg-primary-light text-primary',
  Card: 'bg-warning-light text-warning',
}

function isBorrow(sale: MappedSale): boolean {
  if (sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0) return true
  if (sale.payment_status === 'partial' || sale.payment_status === 'borrowed' || sale.payment_status === 'unpaid') return true
  return false
}

export default memo(function RecentSales({ sales, businessId }: Props) {
  const salesLink = businessId ? `/business/${businessId}/sales` : '/sales'
  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)
  const [view, setView] = useState<'all' | 'sales' | 'borrows'>('all')

  const { paidSales, borrowSales } = useMemo(() => {
    const paid: MappedSale[] = []
    const borrowed: MappedSale[] = []
    for (const s of sales) {
      if (isBorrow(s)) borrowed.push(s)
      else paid.push(s)
    }
    return { paidSales: paid, borrowSales: borrowed }
  }, [sales])

  const displaySales = view === 'borrows' ? borrowSales : view === 'sales' ? paidSales : sales

  return (
    <>
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          <Link href={salesLink} className="text-xs text-primary font-medium hover:underline">View All</Link>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: 'all' as const, label: 'All', count: sales.length },
            { key: 'sales' as const, label: 'Sales', count: paidSales.length },
            { key: 'borrows' as const, label: 'Borrows', count: borrowSales.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-1 text-[10px] opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>
      {displaySales.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-neutral-light uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-center px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {displaySales.map((sale) => {
                const borrow = isBorrow(sale)
                const balance = sale.amount - (sale.amount_paid ?? sale.amount)
                return (
                  <tr key={sale.id} onClick={() => setDetailSale(sale)} className="border-t border-gray-50 table-row-hover cursor-pointer">
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      <div className="flex items-center gap-2">
                        {borrow && (
                          <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                        )}
                        <span className="truncate">{sale.product}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-light">{sale.qty}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {sale.amount > 0 ? (
                        `GH₵${sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-neutral-light text-xs">No charge</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          paymentColors[sale.payment] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {sale.payment}
                        </span>
                        {borrow && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">
                            Borrow
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-light text-xs">{sale.time}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No {view === 'borrows' ? 'borrows' : view === 'sales' ? 'sales' : 'activity'} yet</p>
          <p className="text-xs text-neutral-light mb-3">
            {view === 'borrows'
              ? 'No borrowed items recorded yet'
              : view === 'sales'
              ? 'Record your first sale to see it here'
              : 'Record a sale to get started'}
          </p>
          <Link
            href={salesLink}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Sale
          </Link>
        </div>
      )}
    </div>
    {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </>
  )
})
