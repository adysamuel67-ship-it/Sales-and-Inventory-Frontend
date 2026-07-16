'use client'

import Link from 'next/link'

interface SaleRecord {
  id: number
  product: string
  qty: number
  amount: number
  payment: string
  time: string
}

interface Props {
  sales: SaleRecord[]
  businessId?: number
}

const paymentColors: Record<string, string> = {
  Cash: 'bg-success-light text-success',
  MoMo: 'bg-primary-light text-primary',
  Card: 'bg-warning-light text-warning',
}

export default function RecentSales({ sales, businessId }: Props) {
  const salesLink = businessId ? `/business/${businessId}/sales` : '/sales'

  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Recent Sales</h3>
        <Link href={salesLink} className="text-xs text-primary font-medium hover:underline">View All</Link>
      </div>
      {sales.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-neutral-light uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Product</th>
                <th className="text-center px-4 py-3 font-medium">Qty</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-center px-4 py-3 font-medium">Payment</th>
                <th className="text-right px-5 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-t border-gray-50 table-row-hover">
                  <td className="px-5 py-3 text-gray-900 font-medium">{sale.product}</td>
                  <td className="px-4 py-3 text-center text-neutral-light">{sale.qty}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${paymentColors[sale.payment] || 'bg-gray-100 text-gray-600'}`}>
                      {sale.payment}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-light">{sale.time}</td>
                </tr>
              ))}
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
          <p className="text-sm font-medium text-gray-900 mb-1">No sales yet</p>
          <p className="text-xs text-neutral-light mb-3">Record your first sale to see it here</p>
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
  )
}
