'use client'

import { useEffect, useState } from 'react'
import { saleAPI } from '@/lib/api'
import { parseApiError, formatPayment } from '@/lib/utils'
import Alert from '@/components/ui/Alert'

interface ReceiptItem {
  product_id: number
  name?: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

interface ReceiptData {
  sale_id: number
  business?: { name?: string | null; phone?: string | null } | null
  customer?: { name?: string | null; phone?: string | null } | null
  items?: ReceiptItem[]
  total: number
  amount_paid: number
  payment_method: string
  created_at?: string | null
}

interface Props {
  businessId: number
  saleId: number
  saleLabel?: string
  onClose: () => void
}

function money(value?: number | null): string {
  const num = Number(value ?? 0)
  return isNaN(num) ? '0.00' : num.toFixed(2)
}

export default function SaleReceiptModal({ businessId, saleId, saleLabel, onClose }: Props) {
  const [data, setData] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    saleAPI.getReceipt(businessId, saleId)
      .then((res) => {
        if (cancelled) return
        setData(res.data?.data ?? res.data)
      })
      .catch((err: any) => {
        if (cancelled) return
        setError(parseApiError(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [businessId, saleId])

  const handlePrint = () => {
    if (!data) return
    const itemsHtml = (data.items || [])
      .map((item) => (`
        <tr>
          <td>${item.name || `Product #${item.product_id}`}</td>
          <td>${item.quantity}</td>
          <td>${money(item.unit_price)}</td>
          <td>${money(item.subtotal)}</td>
        </tr>`))
      .join('')
    const balance = Math.max(0, Number(data.total) - Number(data.amount_paid ?? 0))
    const win = window.open('', '_blank', 'width=380,height=600')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt #${data.sale_id}</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 300px; margin: 24px auto; color: #111; font-size: 12px; }
        h1 { text-align: center; font-size: 15px; margin: 0 0 2px; text-transform: uppercase; }
        .sub { text-align: center; color: #555; margin-bottom: 14px; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        hr { border: none; border-top: 1px dashed #999; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px dashed #999; padding: 4px 0; }
        td { padding: 3px 0; }
        .right { text-align: right; }
        .total-row td { border-top: 1px dashed #999; font-weight: bold; padding-top: 6px; }
        .thanks { text-align: center; margin-top: 16px; color: #555; }
      </style></head><body>
      <h1>${data.business?.name || 'Business Receipt'}</h1>
      <div class="sub">${data.business?.phone || ''}</div>
      <div class="row"><span>Receipt #${data.sale_id}</span><span>${data.created_at ? new Date(data.created_at).toLocaleString() : saleLabel || ''}</span></div>
      <div>Customer: ${data.customer?.name || 'Walk-in Customer'}</div>
      ${data.customer?.phone ? `<div>Phone: ${data.customer.phone}</div>` : ''}
      <hr/>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th class="right">Subtotal</th></tr></thead>
        <tbody>${itemsHtml}
          <tr class="total-row"><td colspan="3">TOTAL</td><td class="right">${money(data.total)}</td></tr>
        </tbody>
      </table>
      <hr/>
      <div class="row"><span>Amount paid</span><span>${money(data.amount_paid)}</span></div>
      <div class="row"><span>Payment method</span><span>${formatPayment(data.payment_method)}</span></div>
      ${balance > 0 ? `<div class="row"><span>Balance</span><span>${money(balance)}</span></div>` : ''}
      <div class="thanks">Thank you for your business!</div>
      <script>window.onload = function () { window.print(); }<\/script>
    </body></html>`)
    win.document.close()
  }

  const balance = data ? Math.max(0, Number(data.total) - Number(data.amount_paid ?? 0)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Sale Receipt</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5">
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="font-mono text-sm bg-surfaceAlt rounded-xl p-4">
              <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
                <p className="text-base font-bold uppercase tracking-wide text-gray-900">
                  {data.business?.name || 'Business Receipt'}
                </p>
                {data.business?.phone && <p className="text-xs text-neutral-light mt-0.5">{data.business.phone}</p>}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>{saleLabel}</span>
                <span>
                  {data.created_at ? new Date(data.created_at).toLocaleString() : ''}
                </span>
              </div>
              <p className="text-xs text-neutral-light mb-3">
                Receipt #{data.sale_id} · Customer:{' '}
                <span className="text-gray-900 font-medium">{data.customer?.name || 'Walk-in Customer'}</span>
                {data.customer?.phone ? ` · ${data.customer.phone}` : ''}
              </p>

              <div className="border-t border-dashed border-gray-300 pt-2">
                <div className="flex items-center justify-between text-xs text-neutral-light uppercase tracking-wider pb-1">
                  <span className="flex-1">Item</span>
                  <span className="w-10 text-right">Qty</span>
                  <span className="w-16 text-right">Unit</span>
                  <span className="w-20 text-right">Subtotal</span>
                </div>
                {(data.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <span className="flex-1 pr-2 truncate text-gray-900">{item.name || `Product #${item.product_id}`}</span>
                    <span className="w-10 text-right">{item.quantity}</span>
                    <span className="w-16 text-right">{money(item.unit_price)}</span>
                    <span className="w-20 text-right font-medium">{money(item.subtotal)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-dashed border-gray-300 mt-1 pt-2 text-sm font-bold text-gray-900">
                  <span>TOTAL</span>
                  <span className="w-20 text-right">GH₵{money(data.total)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 mt-3 pt-2 space-y-1 text-xs text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Amount paid</span>
                  <span>GH₵{money(data.amount_paid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Payment method</span>
                  <span className="font-medium">{formatPayment(data.payment_method)}</span>
                </div>
                {balance > 0 && (
                  <div className="flex items-center justify-between text-danger font-semibold">
                    <span>Balance</span>
                    <span>GH₵{money(balance)}</span>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-neutral-light mt-4">Thank you for your business!</p>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-neutral-light">No receipt data available</div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-2xl flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || !data || !!error}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}