'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import SaleDetailModal from '@/components/SaleDetailModal'
import { useAuth } from '@/lib/auth'
import { saleAPI, productAPI } from '@/lib/api'
import { useBusinessId } from '@/lib/useBusinessId'
import { MappedSale } from '@/lib/utils'

type SaleRecord = MappedSale

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
  })
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [draftDateFilter, setDraftDateFilter] = useState({ start: '', end: '' })
  const [activePreset, setActivePreset] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user, router])

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
      await saleAPI.record(businessId, {
        list_items: [{
          product_id: parseInt(form.product_id),
          quantity: parseInt(form.quantity),
        }],
        amount_paid: formTotal,
        payment_method: form.payment_method,
      })
      setForm({ product_id: '', quantity: '', payment_method: 'Cash' })
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

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading || bizLoading ? (
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
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-gray-50 table-row-hover cursor-pointer" onClick={() => setDetailSale(sale)}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">{sale.product}</td>
                      <td className="px-5 py-3.5 text-center text-neutral-light">{sale.qty}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">GH₵{sale.amount.toFixed(2)}</td>
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
          <div className="px-5 py-12 text-center text-neutral-light text-sm">
            {dateFilter.start || dateFilter.end
              ? 'No sales found for the selected date range'
              : 'No sales recorded yet. Record your first sale to get started.'}
          </div>
        )}
      </div>
      {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </DashboardLayout>
  )
}
