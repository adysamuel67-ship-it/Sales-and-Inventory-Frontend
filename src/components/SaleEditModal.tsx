'use client'

import { useEffect, useMemo, useState } from 'react'
import { saleAPI, productAPI, customerAPI } from '@/lib/api'
import { extractArray, normalizeProduct, MappedSale, formatCedi } from '@/lib/utils'

interface Props {
  sale: MappedSale
  businessId: number
  onClose: () => void
  onSaved?: () => void
}

interface EditProduct {
  product_id: number
  name: string
  price: number
  quantity: number
}

function normalizePayment(method?: string): string {
  const m = (method || '').toLowerCase()
  if (m.includes('mobile')) return 'mobile_money'
  if (m === 'cash') return 'cash'
  if (m === 'card') return 'card'
  return m || 'cash'
}

export default function SaleEditModal({ sale, businessId, onClose, onSaved }: Props) {
  const [products, setProducts] = useState<EditProduct[]>([])
  const [lineItems, setLineItems] = useState<{ product_id: string; quantity: string }[]>([])
  const [paymentMethod, setPaymentMethod] = useState(normalizePayment(sale.payment || sale.raw?.payment_method))
  const [paymentStatus, setPaymentStatus] = useState<'fully_paid' | 'partial'>(
    (sale.amount_paid ?? 0) < sale.amount && sale.amount > 0 ? 'partial' : 'fully_paid'
  )
  const [amountPaid, setAmountPaid] = useState(String(sale.amount_paid ?? ''))
  const [customerName, setCustomerName] = useState(sale.customer_name || '')
  const [customerPhone, setCustomerPhone] = useState(sale.customer_phone || '')
  const [customerEmail, setCustomerEmail] = useState(sale.customer_email || '')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [existingCustomers, setExistingCustomers] = useState<any[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!businessId) return
    let cancelled = false
    const seedItems = (sale.sales_items && sale.sales_items.length > 0
      ? sale.sales_items
      : sale.raw?.sales_items || []
    ).map((i: any) => ({
      product_id: String(i.product_id ?? i.productId ?? ''),
      quantity: String(i.quantity ?? ''),
    }))
    const seed = seedItems.length > 0
      ? seedItems
      : [{ product_id: sale.raw?.product_id != null ? String(sale.raw.product_id) : '', quantity: String(sale.qty || '') }]
    Promise.allSettled([
      productAPI.list(businessId),
      customerAPI.list(businessId),
    ]).then(([productsRes, customersRes]) => {
      if (cancelled) return
      if (productsRes.status === 'fulfilled') {
        setProducts(extractArray(productsRes.value.data).map(normalizeProduct))
      }
      if (customersRes.status === 'fulfilled') {
        setExistingCustomers(extractArray(customersRes.value.data))
      }
      setLineItems(seed)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [businessId, sale])

  const oldQtyByProduct = useMemo(() => {
    const map = new Map<number, number>()
    const items = sale.sales_items?.length ? sale.sales_items : (sale.raw?.sales_items || [])
    for (const i of items) {
      const pid = i.product_id ?? i.productId
      if (pid != null) map.set(Number(pid), (map.get(Number(pid)) ?? 0) + (i.quantity ?? 0))
    }
    return map
  }, [sale])

  const allProductOptions = useMemo(() => {
    const map = new Map<number, EditProduct>()
    for (const p of products) map.set(p.product_id, p)
    for (const i of lineItems) {
      const pid = parseInt(i.product_id)
      if (Number.isFinite(pid) && !map.has(pid)) {
        map.set(pid, { product_id: pid, name: `Product #${pid}`, price: 0, quantity: 0 })
      }
    }
    return Array.from(map.values())
  }, [products, lineItems])

  const validLineItems = lineItems.filter((item) => item.product_id && item.quantity)
  const totalAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const pid = parseInt(item.product_id)
      if (!Number.isFinite(pid)) return sum
      const p = allProductOptions.find((o) => o.product_id === pid)
      let price = p && p.price > 0 ? p.price : 0
      if (price === 0) {
        const old = (sale.sales_items || []).find((i: any) => (i.product_id ?? i.productId) === pid)
        price = old?.unit_price ? Number(old.unit_price) : price
      }
      return sum + price * (parseInt(item.quantity) || 0)
    }, 0)
  }, [lineItems, allProductOptions, sale])

  const effectiveAmountPaid = paymentStatus === 'fully_paid' ? totalAmount : (parseFloat(amountPaid) || 0)
  const isPartialPayment = paymentStatus === 'partial' && effectiveAmountPaid < totalAmount && totalAmount > 0

  const stockExceeded = validLineItems.some((item) => {
    const pid = parseInt(item.product_id)
    const p = products.find((o) => o.product_id === pid)
    if (!p) return false
    const restored = oldQtyByProduct.get(pid) ?? 0
    return parseInt(item.quantity) > (p.quantity ?? 0) + restored
  })

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return existingCustomers
    const q = customerSearch.toLowerCase()
    return existingCustomers.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || c.phone_number || c.mobile || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [existingCustomers, customerSearch])

  const selectCustomer = (c: any) => {
    setCustomerName(c.name || '')
    setCustomerPhone(c.phone || c.phone_number || c.mobile || '')
    setCustomerEmail(c.email || '')
    setShowCustomerPicker(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || validLineItems.length === 0) return
    if (paymentStatus === 'partial' && (!amountPaid || parseFloat(amountPaid) < 0)) {
      setError('Enter the amount paid')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload: any = {
        list_items: validLineItems.map((item) => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
        })),
        amount_paid: effectiveAmountPaid,
        payment_method: paymentMethod,
      }

      if (paymentStatus === 'partial' && isPartialPayment && customerPhone.trim()) {
        let customerId: number | null = sale.customer_id ?? null
        try {
          if (!customerId) {
            const customersRes = await customerAPI.list(businessId)
            const customers = extractArray(customersRes.data)
            const existing = customers.find((c: any) => {
              const phone = c.phone || c.phone_number || c.mobile || ''
              return phone === customerPhone.trim()
            })
            if (existing) customerId = existing.customer_id ?? existing.id
          }
        } catch {
        }
        if (!customerId && customerName.trim()) {
          const customerPayload: any = {
            name: customerName.trim(),
            phone: customerPhone.trim(),
          }
          if (customerEmail.trim()) customerPayload.email = customerEmail.trim()
          try {
            const res = await customerAPI.create(businessId, customerPayload)
            customerId = res.data?.customer_id ?? res.data?.id
          } catch {
            setError('Failed to create customer. Please check the details and try again.')
            setSaving(false)
            return
          }
        }
        if (!customerId) {
          setError('A customer is required for a partial payment. Pick an existing customer or enter their details.')
          setSaving(false)
          return
        }
        payload.customer_id = customerId
      } else if (sale.customer_id) {
        payload.customer_id = sale.customer_id
      }

      await saleAPI.update(businessId, sale.id, payload)
      onSaved?.()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg || e.message || e.detail || String(e)).join(', '))
      } else if (typeof detail === 'string' && detail) {
        setError(detail)
      } else {
        setError('Failed to update sale')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h3 className="font-semibold text-gray-900">Edit Sale #{sale.id}</h3>
            <p className="text-xs text-neutral-light">Adjust items, payment or customer details</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
            {error && (
              <div className="bg-danger-light text-danger text-sm p-3.5 rounded-xl border border-danger/10">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Products</label>
              <div className="space-y-3">
                {lineItems.map((item, idx) => {
                  const selectedIds = lineItems.filter((li) => li.product_id).map((li) => li.product_id)
                  const currentItemProduct = products.find((p) => p.product_id === parseInt(item.product_id))
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const updated = [...lineItems]
                          updated[idx] = { ...updated[idx], product_id: e.target.value }
                          setLineItems(updated)
                        }}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
                      >
                        <option value="">Select a product</option>
                        {allProductOptions
                          .filter((p) => !selectedIds.includes(String(p.product_id)) || p.product_id === parseInt(item.product_id))
                          .map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} — {formatCedi(p.price ?? 0)} ({p.quantity ?? 0} in stock)
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...lineItems]
                          updated[idx] = { ...updated[idx], quantity: e.target.value }
                          setLineItems(updated)
                        }}
                        placeholder="Qty"
                        className="w-20 px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-neutral-light hover:text-danger hover:bg-danger-light transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
                {lineItems.some((item) => {
                  const pid = parseInt(item.product_id)
                  const p = products.find((o) => o.product_id === pid)
                  if (!p) return false
                  return parseInt(item.quantity) > (p.quantity ?? 0) + (oldQtyByProduct.get(pid) ?? 0)
                }) && (
                  <p className="text-xs text-danger">One or more items exceed available stock</p>
                )}
                <button
                  type="button"
                  onClick={() => setLineItems([...lineItems, { product_id: '', quantity: '' }])}
                  className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-neutral-light hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
              <div className="flex gap-2">
                {[
                  { value: 'cash', label: 'Cash' },
                  { value: 'mobile_money', label: 'Mobile Money' },
                  { value: 'card', label: 'Card' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      paymentMethod === value
                        ? value === 'cash' ? 'bg-success text-white'
                          : value === 'mobile_money' ? 'bg-primary text-white'
                          : 'bg-warning text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentStatus('fully_paid'); setAmountPaid(String(totalAmount)) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                    paymentStatus === 'fully_paid'
                      ? 'bg-success text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Fully Paid
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('partial')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                    paymentStatus === 'partial'
                      ? 'bg-warning text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Partial Payment
                </button>
              </div>
            </div>

            {paymentStatus === 'partial' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount Paid (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomerPicker(true)
                      setCustomerSearch('')
                    }}
                    className="text-xs font-medium text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Pick Existing
                  </button>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer's full name"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com (optional)"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
                {isPartialPayment && (
                  <div className="px-4 py-3 rounded-xl bg-warning-light border border-warning/20">
                    <p className="text-xs text-warning font-medium">
                      Balance: {formatCedi(totalAmount - effectiveAmountPaid)} remaining
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="px-4 py-4 rounded-xl bg-surfaceAlt border border-border">
              <p className="text-xs text-neutral-light uppercase tracking-wider mb-2">Order Summary</p>
              <div className="space-y-1.5">
                {validLineItems.map((item, idx) => {
                  const p = allProductOptions.find((o) => o.product_id === parseInt(item.product_id))
                  if (!p) return null
                  const qty = parseInt(item.quantity) || 0
                  const pid = p.product_id
                  const rawP = allProductOptions.find((o) => o.product_id === pid)
                  let price = rawP && rawP.price > 0 ? rawP.price : 0
                  if (price === 0) {
                    const old = (sale.sales_items || []).find((i: any) => (i.product_id ?? i.productId) === pid)
                    price = old?.unit_price ? Number(old.unit_price) : price
                  }
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{p.name} × {qty}</span>
                      <span className="font-medium text-gray-900">{formatCedi(price * qty)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCedi(totalAmount)}</p>
              </div>
              {paymentStatus === 'partial' && effectiveAmountPaid > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-neutral-light">Amount Paid</p>
                  <p className="text-sm font-semibold text-success">{formatCedi(effectiveAmountPaid)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving || validLineItems.length === 0 || stockExceeded}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {showCustomerPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowCustomerPicker(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="font-semibold text-gray-900 text-sm mb-2">Pick a Customer</p>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="overflow-y-auto max-h-64">
              {filteredCustomers.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-neutral-light">No customers found</div>
              ) : (
                filteredCustomers.map((c: any) => (
                  <button
                    key={c.customer_id ?? c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="w-full px-4 py-3 flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-neutral-light truncate">{c.phone || c.phone_number || c.mobile || c.email || 'No contact'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}