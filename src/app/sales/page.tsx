'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import SaleDetailModal from '@/components/SaleDetailModal'
import { useAuth } from '@/lib/auth'
import { saleAPI, productAPI, customerAPI } from '@/lib/api'
import { useBusinessId } from '@/lib/useBusinessId'
import { extractArray, normalizeProduct, mapSale, MappedSale } from '@/lib/utils'

type SaleRecord = MappedSale

interface Product {
  product_id: number
  name: string
  price: number
  quantity: number
  [key: string]: any
}

const datePresets = [
  { label: 'All', days: 0 },
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export default function SalesPage() {
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user } = useAuth()
  const router = useRouter()
  const { businessId, loading: bizLoading } = useBusinessId()
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
    customer_name: '',
    customer_phone: '',
  })
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [draftDateFilter, setDraftDateFilter] = useState({ start: '', end: '' })
  const [activePreset, setActivePreset] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user?.is_verified, router])

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

  useEffect(() => {
    loadData()
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

  const handleOpenDatePicker = () => {
    setDraftDateFilter(dateFilter)
    setShowDatePicker(true)
  }

  const handleApplyCustomDate = () => {
    setDateFilter(draftDateFilter)
    setActivePreset(0)
    setShowDatePicker(false)
  }

  const selectedProduct = products.find((p) => p.product_id === parseInt(form.product_id))
  const formTotal = selectedProduct ? selectedProduct.price * (parseInt(form.quantity) || 0) : 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !form.product_id || !form.quantity) return
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      let customerId: number | undefined

      if (form.customer_name.trim()) {
        const nameLower = form.customer_name.trim().toLowerCase()
        try {
          const custRes = await customerAPI.list(businessId)
          const existing = extractArray(custRes.data)
          const match = existing.find((c: any) => c.name?.toLowerCase() === nameLower)
          if (match) {
            customerId = match.customer_id ?? match.id
          } else {
            const newCust = await customerAPI.create(businessId, {
              name: form.customer_name.trim(),
              phone: form.customer_phone.trim() || undefined,
            })
            customerId = newCust.data?.customer_id ?? newCust.data?.id
          }
        } catch {
        }
      }

      await saleAPI.record(businessId, {
        list_items: [{
          product_id: parseInt(form.product_id),
          quantity: parseInt(form.quantity),
        }],
        amount_paid: formTotal,
        payment_method: form.payment_method,
        ...(customerId ? { customer_id: customerId } : {}),
      })
      setForm({ product_id: '', quantity: '', payment_method: 'Cash', customer_name: '', customer_phone: '' })
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

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const paymentBadge = (method: string) =>
    method === 'Cash' ? 'bg-success-light text-success'
      : method === 'MoMo' ? 'bg-primary-light text-primary'
      : method === 'Card' ? 'bg-warning-light text-warning'
      : 'bg-gray-100 text-gray-600'

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-neutral-light mt-1">Record and view your sales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Sale
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl">{success}</div>
      )}

      {showForm && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Record New Sale</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.quantity ?? undefined}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              {selectedProduct && parseInt(form.quantity) > (selectedProduct.quantity ?? 0) && (
                <p className="text-xs text-danger mt-1">Exceeds available stock ({selectedProduct.quantity})</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="MoMo">Mobile Money (MoMo)</option>
                <option value="Card">Card</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-neutral-light">Total Amount</p>
                <p className="text-lg font-bold text-gray-900">GH₵{formTotal.toFixed(2)}</p>
              </div>
            </div>
            <div className="sm:col-span-2 border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Customer (optional — auto-created if new)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    placeholder="Leave blank if no customer"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    placeholder="024XXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={creating || !form.product_id || !form.quantity || (selectedProduct ? parseInt(form.quantity) > (selectedProduct.quantity ?? 0) : false)}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? 'Recording...' : 'Record Sale'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
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
              onClick={() => showDatePicker ? setShowDatePicker(false) : handleOpenDatePicker()}
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
                      value={draftDateFilter.start}
                      onChange={(e) => setDraftDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">To</label>
                    <input
                      type="date"
                      value={draftDateFilter.end}
                      onChange={(e) => setDraftDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-primary outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleApplyCustomDate}
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
          <span className="font-semibold text-gray-900">GH₵{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {loading || bizLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSales.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSales.map((sale) => {
              const isPartial = sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0
              const balance = sale.amount - (sale.amount_paid ?? sale.amount)
              return (
              <button
                key={sale.id}
                onClick={() => setDetailSale(sale)}
                className="bg-surface rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPartial && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${paymentBadge(sale.payment)}`}>
                      {sale.payment}
                    </span>
                  </div>
                </div>

                <h3 className="font-medium text-gray-900 text-sm mb-1 truncate group-hover:text-primary transition-colors">
                  {sale.product}
                </h3>

                <div className="flex items-baseline gap-1 mb-3">
                  {isPartial ? (
                    <>
                      <span className="text-lg font-bold text-danger">GH₵{balance.toFixed(2)}</span>
                      <span className="text-xs text-neutral-light">left of GH₵{sale.amount.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">GH₵{sale.amount.toFixed(2)}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-light">Qty: {sale.qty}</span>
                  {isPartial && (
                    <span className="text-warning font-medium">
                      GH₵{(sale.amount_paid ?? 0).toFixed(2)} paid
                    </span>
                  )}
                  {!isPartial && sale.customer_name && (
                    <span className="text-primary font-medium truncate ml-2">{sale.customer_name}</span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-light">{sale.time}</span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-primary/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )})}
          </div>
          {filteredSales.length > 20 && (
            <div className="mt-6 text-center text-xs text-neutral-light">
              Showing {Math.min(filteredSales.length, 20)} of {filteredSales.length} sales
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {dateFilter.start || dateFilter.end
              ? 'No sales found for the selected date range'
              : 'No sales recorded yet'}
          </p>
          <p className="text-xs text-neutral-light mb-4">
            {dateFilter.start || dateFilter.end
              ? 'Try a different date range'
              : 'Record your first sale to get started'}
          </p>
          {!dateFilter.start && !dateFilter.end && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              Record Sale
            </button>
          )}
        </div>
      )}
      {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </DashboardLayout>
  )
}
