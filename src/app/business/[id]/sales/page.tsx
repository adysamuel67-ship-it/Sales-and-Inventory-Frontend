'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { saleAPI, productAPI, customerAPI } from '@/lib/api'

interface SaleRecord {
  id: number
  product: string
  qty: number
  amount: number
  payment: string
  time: string
  created_at?: string
}

interface Product {
  product_id: number
  name: string
  price: number
  quantity: number
  [key: string]: any
}

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
  }
  return []
}

function normalizeProduct(raw: any): Product {
  return {
    product_id: raw.product_id ?? raw.id,
    name: raw.name,
    price: raw.price ?? 0,
    quantity: raw.quantity ?? raw.stock ?? 0,
    ...raw,
  }
}

function mapSale(raw: any, productMap: Map<number, string>): SaleRecord {
  const items = raw.sales_items || []
  const productNames = items.map((i: any) => {
    if (i.product_name || i.name) return i.product_name || i.name
    const pid = i.product_id ?? i.productId
    if (pid != null && productMap.has(pid)) return productMap.get(pid)!
    return pid != null ? `Product #${pid}` : 'Unknown'
  }).join(', ')
  const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0)
  return {
    id: raw.sale_id ?? raw.id,
    product: productNames || 'Unknown',
    qty: totalQty,
    amount: raw.total_amount ?? raw.amount ?? 0,
    payment: raw.payment_method || raw.payment || 'N/A',
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleString()
      : raw.time || '',
    created_at: raw.created_at,
  }
}

const PAGE_SIZE = 20

const datePresets = [
  { label: 'All', days: 0 },
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export default function SalesPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()
  const [allSales, setAllSales] = useState<SaleRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    payment_method: 'Cash',
  })
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [activePreset, setActivePreset] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'fully_paid' | 'partial'>('fully_paid')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const isStaff = user?.role === 'STAFF' || user?.role === 'staff'

  const loadData = async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const [salesRes, productsRes] = await Promise.allSettled([
        saleAPI.list(businessId),
        productAPI.list(businessId),
      ])
      const productsList = productsRes.status === 'fulfilled' ? extractArray(productsRes.value.data).map(normalizeProduct) : []
      if (productsRes.status === 'fulfilled') setProducts(productsList)
      const productMap = new Map<number, string>()
      for (const p of productsList) {
        productMap.set(p.product_id, p.name)
      }
      if (salesRes.status === 'fulfilled') setAllSales(extractArray(salesRes.value.data).map((s) => mapSale(s, productMap)))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = useMemo(() => {
    if (!dateFilter.start && !dateFilter.end) return allSales
    return allSales.filter((sale) => {
      if (!sale.created_at) return false
      const saleDate = new Date(sale.created_at)
      if (dateFilter.start && saleDate < new Date(dateFilter.start)) return false
      if (dateFilter.end) {
        const end = new Date(dateFilter.end)
        end.setHours(23, 59, 59, 999)
        if (saleDate > end) return false
      }
      return true
    })
  }, [allSales, dateFilter])

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE)
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSales.slice(start, start + PAGE_SIZE)
  }, [filteredSales, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter])

  useEffect(() => {
    if (businessId) loadData()
  }, [businessId])

  const totalAmount = useMemo(() => filteredSales.reduce((sum, s) => sum + s.amount, 0), [filteredSales])
  const totalQty = useMemo(() => filteredSales.reduce((sum, s) => sum + s.qty, 0), [filteredSales])

  const handlePreset = (days: number) => {
    setActivePreset(days)
    if (days === 0) {
      setDateFilter({ start: '', end: '' })
    } else {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
      setDateFilter({ start, end })
    }
    setShowDatePicker(false)
  }

  const selectedProduct = products.find((p) => p.product_id === parseInt(form.product_id))
  const formTotal = selectedProduct ? selectedProduct.price * (parseInt(form.quantity) || 0) : 0
  const effectiveAmountPaid = paymentStatus === 'fully_paid' ? formTotal : (parseFloat(amountPaid) || 0)
  const isPartialPayment = paymentStatus === 'partial' && effectiveAmountPaid < formTotal && formTotal > 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !form.product_id || !form.quantity) return
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const salePayload: any = {
        list_items: [{
          product_id: parseInt(form.product_id),
          quantity: parseInt(form.quantity),
        }],
        amount_paid: effectiveAmountPaid,
        payment_method: form.payment_method,
      }

      if (paymentStatus === 'partial' && customerName.trim() && customerPhone.trim()) {
        let customerId: number | null = null
        try {
          const customersRes = await customerAPI.list(businessId)
          const customers = extractArray(customersRes.data)
          const existing = customers.find((c: any) => {
            const phone = c.phone || c.phone_number || c.mobile || ''
            return phone === customerPhone.trim()
          })
          if (existing) {
            customerId = existing.customer_id ?? existing.id
          }
        } catch {
        }

        if (!customerId) {
          const params = new URLSearchParams({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            return_sale: '1',
            amount_paid: String(effectiveAmountPaid),
            payment_method: form.payment_method,
            product_id: form.product_id,
            quantity: form.quantity,
          })
          window.location.href = `/business/${businessId}/customers?${params.toString()}`
          return
        }

        salePayload.customer_id = customerId
      }

      await saleAPI.record(businessId, salePayload)
      setForm({ product_id: '', quantity: '', payment_method: 'Cash' })
      setPaymentStatus('fully_paid')
      setAmountPaid('')
      setCustomerName('')
      setCustomerPhone('')
      setShowForm(false)
      setSuccess('Sale recorded successfully!')
      loadData()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to record sale')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (saleId: number) => {
    if (!businessId) return
    try {
      await saleAPI.delete(businessId, saleId)
      setDeleteConfirm(null)
      loadData()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete sale')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-neutral-light mt-1">Record and view your sales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Sale
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Record New Sale</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name} — GH₵{(p.price ?? 0).toFixed(2)} ({p.quantity ?? 0} in stock)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.quantity ?? undefined}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
              {selectedProduct && parseInt(form.quantity) > (selectedProduct.quantity ?? 0) && (
                <p className="text-xs text-danger mt-1">Exceeds available stock ({selectedProduct.quantity})</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
              <div className="flex gap-2">
                {['Cash', 'MoMo', 'Card'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, payment_method: method })}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                      form.payment_method === method
                        ? method === 'Cash' ? 'bg-success text-white'
                          : method === 'MoMo' ? 'bg-primary text-white'
                          : 'bg-warning text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {method === 'MoMo' ? 'Mobile Money' : method}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setPaymentStatus('fully_paid'); setAmountPaid('') }}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
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
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
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
                    max={formTotal}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer's full name"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="024XXXXXXX"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                {isPartialPayment && (
                  <div className="px-4 py-3 rounded-xl bg-warning-light border border-warning/20">
                    <p className="text-xs text-warning font-medium">
                      Balance: GH₵{(formTotal - effectiveAmountPaid).toFixed(2)} remaining
                    </p>
                  </div>
                )}
              </>
            )}
            <div className="px-4 py-4 rounded-xl bg-surfaceAlt border border-border">
              <p className="text-xs text-neutral-light uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">GH₵{formTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              {paymentStatus === 'partial' && effectiveAmountPaid > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-neutral-light">Amount Paid</p>
                  <p className="text-sm font-semibold text-success">GH₵{effectiveAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creating || !form.product_id || !form.quantity || (selectedProduct ? parseInt(form.quantity) > (selectedProduct.quantity ?? 0) : false)}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {creating ? 'Recording...' : paymentStatus === 'partial' ? 'Record Partial Sale' : 'Confirm Sale'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePreset === preset.days
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Custom
            </button>
            {showDatePicker && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => { setDateFilter((prev) => ({ ...prev, start: e.target.value })); setActivePreset(0) }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">To</label>
                    <input
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => { setDateFilter((prev) => ({ ...prev, end: e.target.value })); setActivePreset(0) }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-full mt-3 px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-light">
          <span>{filteredSales.length} sales</span>
          <span>{totalQty} items</span>
          <span className="font-semibold text-gray-900">GH₵{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : paginatedSales.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium">Product</th>
                    <th className="text-center px-5 py-3 font-medium">Qty</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-center px-5 py-3 font-medium">Payment</th>
                    <th className="text-right px-5 py-3 font-medium">Date</th>
                    {!isStaff && <th className="text-right px-5 py-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-gray-50 table-row-hover">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{sale.product}</td>
                      <td className="px-5 py-3.5 text-center text-neutral-light">{sale.qty}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment === 'Cash' ? 'bg-success-light text-success'
                            : sale.payment === 'MoMo' ? 'bg-primary-light text-primary'
                            : sale.payment === 'Card' ? 'bg-warning-light text-warning'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {sale.payment}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-neutral-light text-xs">{sale.time}</td>
                      {!isStaff && (
                        <td className="px-5 py-3.5 text-right">
                          {deleteConfirm === sale.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleDelete(sale.id)}
                                className="px-2 py-1 text-xs font-medium text-white bg-danger rounded-lg"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(sale.id)}
                              className="text-xs text-danger hover:underline font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-neutral-light">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {dateFilter.start || dateFilter.end
                ? 'No sales found for the selected date range'
                : 'No sales recorded yet'}
            </p>
            <p className="text-xs text-neutral-light mb-3">
              {dateFilter.start || dateFilter.end
                ? 'Try adjusting your date filters'
                : 'Record your first sale to get started'}
            </p>
            {!dateFilter.start && !dateFilter.end && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Sale
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
