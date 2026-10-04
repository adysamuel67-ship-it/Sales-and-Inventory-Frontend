'use client'

import { useEffect, useMemo, useState } from 'react'
import { saleAPI, productAPI, customerAPI, debtAPI } from '@/lib/api'
import { extractArray, normalizeProduct, MappedSale, formatCedi } from '@/lib/utils'
import ProductCombobox from '@/components/ui/ProductCombobox'
import { defaultDebtDueDate, outstandingBalance } from '@/lib/sms'

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
  /**
   * Debt details. The backend's update_sale() already creates the Debt row
   * automatically whenever amount_paid < total_amount, linked by sale_id, so
   * these fields do not create a second debt - they record what the user
   * intends and are sent through as the debt terms.
   */
  const [debtDueDate, setDebtDueDate] = useState(() => defaultDebtDueDate())
  const [debtNote, setDebtNote] = useState('')
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
  /**
   * True whenever the saved sale will leave a balance. Covers the implicit
   * case where paymentStatus is still "fully_paid" but a stale amountPaid is
   * lower than the recalculated total, and drives the debt fields.
   */
  const hasOutstandingBalance = outstandingBalance(totalAmount, effectiveAmountPaid) > 0

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
      const balance = outstandingBalance(totalAmount, effectiveAmountPaid)
      const payload: any = {
        list_items: validLineItems.map((item) => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
        })),
        amount_paid: effectiveAmountPaid,
        payment_method: paymentMethod,
      }

      /**
       * Debt terms. update_sale() derives the balance itself, so these only
       * carry the user's intent - the due date the backend will ignore if the
       * sale ends up fully paid.
       */
      if (balance > 0) {
        if (debtDueDate) payload.due_date = `${debtDueDate}T23:59:59Z`
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

      /**
       * A balance always needs a customer: update_sale() rejects the whole
       * edit with 400 when a debt is left outstanding and no customer is set.
       * This runs even when no phone number was typed, because the debt case
       * does not actually require one.
       */
      let customerIdForDebt: number | null = payload.customer_id ?? null
      if (balance > 0 && customerIdForDebt == null) {
        try {
          const customersRes = await customerAPI.list(businessId)
          const customers = extractArray(customersRes.data)
          const phone = customerPhone.trim()
          const matched = phone
            ? customers.find((c: any) => (c.phone || c.phone_number || c.mobile || '') === phone)
            : null
          customerIdForDebt = matched ? matched.customer_id ?? matched.id : null
        } catch {
          customerIdForDebt = null
        }
        if (customerIdForDebt == null && customerName.trim()) {
          try {
            const existing = existingCustomers.find(
              (c: any) => (c.name || '').toLowerCase() === customerName.trim().toLowerCase()
            )
            customerIdForDebt = existing ? existing.customer_id ?? existing.id : null
          } catch {
            customerIdForDebt = null
          }
        }
        if (customerIdForDebt != null) {
          payload.customer_id = customerIdForDebt
        } else {
          setError(
            'This sale leaves a balance, so a customer is required. Pick an existing customer or enter their details.'
          )
          setSaving(false)
          return
        }
      }

      await saleAPI.update(businessId, sale.id, payload)

      /**
       * update_sale() creates the Debt row itself, linked by sale_id, with a
       * 30-day default due date. It ignores the `due_date` we sent, so the
       * user's chosen date is applied here via the debt endpoint. This is
       * best-effort: a failure here must not fail an otherwise-successful
       * sale edit, so it is reported as a warning rather than an error.
       */
      if (balance > 0 && customerIdForDebt != null && debtDueDate) {
        try {
          await debtAPI.updateDebt(businessId, customerIdForDebt, {
            due_date: `${debtDueDate}T23:59:59Z`,
            note: debtNote.trim() || undefined,
          })
        } catch (debtErr: any) {
          const detail = debtErr?.response?.data?.detail
          setError(
            typeof detail === 'string'
              ? `Sale updated, but the debt due date could not be saved: ${detail}`
              : 'Sale updated, but the debt due date could not be saved.'
          )
        }
      }
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
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h3 className="font-semibold text-slate-900">Edit Sale #{sale.id}</h3>
            <p className="text-xs text-neutral-light">Adjust items, payment or customer details</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Products</label>
              <div className="space-y-3">
                {lineItems.map((item, idx) => {
                  const selectedIds = lineItems.filter((li) => li.product_id).map((li) => li.product_id)
                  const currentItemProduct = products.find((p) => p.product_id === parseInt(item.product_id))
                  return (
                    <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <ProductCombobox
                        id={`edit-product-${idx}`}
                        className="flex-1"
                        products={allProductOptions}
                        value={item.product_id}
                        onChange={(pid) => {
                          const updated = [...lineItems]
                          updated[idx] = { ...updated[idx], product_id: pid }
                          setLineItems(updated)
                        }}
                        excludeIds={selectedIds}
                        placeholder="Search products by name, SKU or category"
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            id={`edit-qty-${idx}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...lineItems]
                              updated[idx] = { ...updated[idx], quantity: e.target.value }
                              setLineItems(updated)
                            }}
                            placeholder="Qty"
                            aria-label={`Quantity for ${currentItemProduct?.name || `item ${idx + 1}`}`}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 sm:w-20"
                          />
                          {currentItemProduct && (
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-neutral-light">
                              /{currentItemProduct.quantity ?? 0}
                            </span>
                          )}
                        </div>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                            aria-label={`Remove item ${idx + 1}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-neutral-light transition-colors hover:bg-rose-50 hover:text-danger"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
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
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-neutral-light hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
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
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentStatus('fully_paid'); setAmountPaid(String(totalAmount)) }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                    paymentStatus === 'fully_paid'
                      ? 'bg-success text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Partial Payment
                </button>
              </div>
            </div>

            {paymentStatus === 'partial' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Customer</label>
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
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com (optional)"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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

            {/* ── Debt details ──────────────────────────────────────────
                The backend creates the Debt row itself whenever the saved
                amount_paid is below the total, so these fields describe the
                balance the shopkeeper is taking on rather than creating a
                second one. */}
            {hasOutstandingBalance && (
              <div className="rounded-xl border border-warning/30 bg-warning-light/40 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 shrink-0 text-warning mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0l-7 12a2 2 0 001.74 3z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Record the remaining {formatCedi(outstandingBalance(totalAmount, effectiveAmountPaid))} as debt
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      This amount is short of the {formatCedi(totalAmount)} total, so it is tracked as a debt
                      against {customerName.trim() || 'this customer'}.
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="debt-due-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Payment due by
                  </label>
                  <input
                    id="debt-due-date"
                    type="date"
                    value={debtDueDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
                  />
                </div>

                <div>
                  <label htmlFor="debt-note" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Note (optional)
                  </label>
                  <input
                    id="debt-note"
                    type="text"
                    value={debtNote}
                    onChange={(e) => setDebtNote(e.target.value)}
                    placeholder="e.g. Part payment, rest due at market close"
                    maxLength={150}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
              </div>
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
                      <span className="text-slate-600">{p.name} × {qty}</span>
                      <span className="font-medium text-slate-900">{formatCedi(price * qty)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-slate-200 mt-2 pt-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCedi(totalAmount)}</p>
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
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors min-h-[44px]"
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
            <div className="px-4 py-3 border-b border-slate-200">
              <p className="font-semibold text-slate-900 text-sm mb-2">Pick a Customer</p>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                    className="w-full px-4 py-3 flex items-center gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.name || 'Unknown'}</p>
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