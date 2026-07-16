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
}

const paymentColors: Record<string, string> = {
  Cash: 'bg-success-light text-success',
  MoMo: 'bg-primary-light text-primary',
  Card: 'bg-warning-light text-warning',
}

export default function RecentSales({ sales }: Props) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Recent Sales</h3>
        <Link href="/sales" className="text-xs text-primary font-medium hover:underline">View All</Link>
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
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">GH₵{sale.amount.toFixed(2)}</td>
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
        <div className="px-5 py-8 text-center text-neutral-light text-sm">
          No recent sales
        </div>
      )}
    </div>
  )
}
