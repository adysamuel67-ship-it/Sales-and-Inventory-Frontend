'use client'

import { useEffect } from 'react'
import { MappedSale, formatPayment } from '@/lib/utils'

interface Props {
  sale: MappedSale
  onClose: () => void
}

const paymentColorMap: Record<string, string> = {
  cash: 'bg-success-light text-success',
  mobile_money: 'bg-primary-light text-primary',
  card: 'bg-warning-light text-warning',
}

export default function SaleDetailModal({ sale, onClose }: Props) {
  const isPartial = sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0
  const balance = sale.amount - (sale.amount_paid ?? sale.amount)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900">Sale Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-neutral-light">Sale #{sale.id}</p>
              {isPartial ? (
                <p className="text-lg font-bold text-danger">GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-medium text-neutral-light">remaining</span></p>
              ) : (
                <p className="text-lg font-bold text-gray-900">GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-1">Payment Method</p>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${paymentColorMap[sale.payment] || 'bg-gray-100 text-gray-600'}`}>
                {formatPayment(sale.payment)}
              </span>
            </div>
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-1">Status</p>
              {isPartial ? (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-warning-light text-warning">Partial Payment</span>
              ) : (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-success-light text-success">Fully Paid</span>
              )}
            </div>
          </div>

          {isPartial && (
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light uppercase tracking-wider mb-2">Payment Progress</p>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((sale.amount_paid ?? 0) / sale.amount) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-success font-medium">GH₵{(sale.amount_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} paid</span>
                <span className="text-danger font-medium">GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining</span>
              </div>
            </div>
          )}

          {(sale.customer_name || sale.customer_phone || sale.customer_email) && (
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-2">Customer</p>
              <div className="space-y-2">
                {sale.customer_name && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {sale.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{sale.customer_name}</span>
                  </div>
                )}
                {sale.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-3.5 h-3.5 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span>{sale.customer_phone}</span>
                  </div>
                )}
                {sale.customer_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-3.5 h-3.5 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span>{sale.customer_email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {sale.sold_by_name && (
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-2">Sold By</p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {sale.sold_by_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{sale.sold_by_name}</span>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs text-neutral-light uppercase tracking-wider mb-2">Items</p>
            <div className="space-y-1">
              {sale.sales_items && sale.sales_items.length > 0 ? (
                sale.sales_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-surfaceAlt rounded-lg text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{item.product_name || item.name || 'Unknown Product'}</span>
                      <span className="text-neutral-light text-xs">× {item.quantity}</span>
                    </div>
                    {item.unit_price != null && (
                      <span className="font-medium text-gray-900">GH₵{(Number(item.unit_price) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2 px-3 bg-surfaceAlt rounded-lg text-sm">
                  <span className="font-medium text-gray-900">{sale.product}</span>
                  <span className="text-neutral-light ml-2">× {sale.qty}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-light">Total Sale Amount</span>
              <span className="font-semibold text-gray-900">GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {sale.amount_paid != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-light">Amount Paid</span>
                <span className="font-semibold text-success">GH₵{sale.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {isPartial && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-light">Outstanding Balance</span>
                <span className="font-semibold text-danger">GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          <div className="bg-surfaceAlt rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="text-gray-700">{sale.time || 'No date'}</span>
            </div>
            {sale.note && (
              <div className="flex items-start gap-2 text-sm">
                <svg className="w-4 h-4 text-neutral-light shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <span className="text-gray-700">{sale.note}</span>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
