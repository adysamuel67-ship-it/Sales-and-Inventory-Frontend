'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { saleAPI, productAPI, customerAPI, adminAPI } from '@/lib/api'
import { extractArray, normalizeProduct, mapSale, parseApiError, isStaffRole, MappedSale, formatPayment } from '@/lib/utils'
import SaleDetailModal from '@/components/SaleDetailModal'

type SaleRecord = MappedSale

interface Product {
  product_id: number
  name: string
  price: number
  quantity: number
  [key: string]: any
}

const PAGE_SIZE = 20

const datePresets = [
  { label: 'All', days: 0 },
  { label: 'Today', days: 1 },
  { label: '3d', days: 3 },
  { label: '5d', days: 5 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30, adminOnly: true },
  { label: '90d', days: 90, adminOnly: true },
]

export default function SalesPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()
  const [allSales, setAllSales] = useState<SaleRecord[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [lineItems, setLineItems] = useState<{ product_id: string; quantity: string }[]>([
    { product_id: '', quantity: '' },
  ])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' })
  const [draftDateFilter, setDraftDateFilter] = useState({ start: '', end: '' })
  const [activePreset, setActivePreset] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'fully_paid' | 'partial'>('fully_paid')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const isStaff = isStaffRole(user?.business_role || user?.role)

  const loadData = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const [salesRes, productsRes, membersRes] = await Promise.allSettled([
        saleAPI.list(businessId),
        productAPI.list(businessId),
        adminAPI.listMembers(),
      ])
      const productsList = productsRes.status === 'fulfilled' ? extractArray(productsRes.value.data).map(normalizeProduct) : []
      if (productsRes.status === 'fulfilled') setProducts(productsList)
      const productMap = new Map<number, string>()
      for (const p of productsList) {
        productMap.set(p.product_id, p.name)
      }
      const userMap = new Map<number, string>()
      if (membersRes.status === 'fulfilled') {
        const members = extractArray(membersRes.value.data)
        for (const m of members) {
          const uid = m.user_id ?? m.id
          if (uid != null && m.name) {
            userMap.set(Number(uid), m.name)
          }
        }
      }
      if (salesRes.status === 'fulfilled') setAllSales(extractArray(salesRes.value.data).map((s) => mapSale(s, productMap, userMap)))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [businessId])

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
  }, [businessId, loadData])

  const totalAmount = useMemo(() => filteredSales.reduce((sum, s) => sum + s.amount, 0), [filteredSales])
  const totalQty = useMemo(() => filteredSales.reduce((sum, s) => sum + s.qty, 0), [filteredSales])

  const formTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => {
      const product = products.find((p) => p.product_id === parseInt(item.product_id))
      return sum + (product ? product.price * (parseInt(item.quantity) || 0) : 0)
    }, 0)
  }, [lineItems, products])

  if (isNaN(businessId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid business</h2>
        <p className="text-sm text-gray-500">This business doesn&apos;t exist or the URL is invalid.</p>
      </div>
    )
  }

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
    if (isStaff && draftDateFilter.start && draftDateFilter.end) {
      const start = new Date(draftDateFilter.start)
      const end = new Date(draftDateFilter.end)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000)
      if (diffDays > 7) {
        setError('Staff accounts can only filter up to 7 days at a time')
        return
      }
    }
    setDateFilter(draftDateFilter)
    setActivePreset(0)
    setShowDatePicker(false)
  }

  const effectiveAmountPaid = paymentStatus === 'fully_paid' ? formTotal : (parseFloat(amountPaid) || 0)
  const isPartialPayment = paymentStatus === 'partial' && effectiveAmountPaid < formTotal && formTotal > 0

  const validLineItems = lineItems.filter((item) => item.product_id && item.quantity)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || validLineItems.length === 0) return
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      const salePayload: any = {
        list_items: validLineItems.map((item) => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
        })),
        amount_paid: effectiveAmountPaid,
        payment_method: paymentMethod,
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
          try {
            const customerPayload: any = {
              name: customerName.trim(),
              phone: customerPhone.trim(),
            }
            if (customerEmail.trim()) {
              customerPayload.email = customerEmail.trim()
            }
            const newCustomerRes = await customerAPI.create(businessId, customerPayload)
            customerId = newCustomerRes.data?.customer_id ?? newCustomerRes.data?.id
          } catch {
            setError('Failed to create customer. Please check the details and try again.')
            setCreating(false)
            return
          }
        }

        salePayload.customer_id = customerId
      }

      await saleAPI.record(businessId, salePayload)
      setLineItems([{ product_id: '', quantity: '' }])
      setPaymentMethod('cash')
      setPaymentStatus('fully_paid')
      setAmountPaid('')
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
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
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-neutral-light mt-0.5">Record and view your sales</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px] w-full sm:w-auto justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Record Sale
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {/* Record Sale Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Record New Sale</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Products</label>
              {lineItems.map((item, idx) => {
                const selectedIds = lineItems.filter((li) => li.product_id).map((li) => li.product_id)
                const availableProducts = products.filter((p) => !selectedIds.includes(String(p.product_id)) || p.product_id === parseInt(item.product_id))
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
                      className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
                    >
                      <option value="">Select a product</option>
                      {availableProducts.map((p) => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.name} — GH₵{(p.price ?? 0).toFixed(2)} ({p.quantity ?? 0} in stock)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      max={currentItemProduct?.quantity ?? undefined}
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...lineItems]
                        updated[idx] = { ...updated[idx], quantity: e.target.value }
                        setLineItems(updated)
                      }}
                      placeholder="Qty"
                      className="w-20 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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
                const product = products.find((p) => p.product_id === parseInt(item.product_id))
                return product && parseInt(item.quantity) > (product.quantity ?? 0)
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
                  onClick={() => { setPaymentStatus('fully_paid'); setAmountPaid('') }}
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
                    max={formTotal}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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
              <p className="text-xs text-neutral-light uppercase tracking-wider mb-2">Order Summary</p>
              <div className="space-y-1.5">
                {validLineItems.map((item, idx) => {
                  const product = products.find((p) => p.product_id === parseInt(item.product_id))
                  if (!product) return null
                  const qty = parseInt(item.quantity) || 0
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{product.name} × {qty}</span>
                      <span className="font-medium text-gray-900">GH₵{(product.price * qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">GH₵{formTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
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
                disabled={creating || validLineItems.length === 0 || lineItems.some((item) => {
                  const product = products.find((p) => p.product_id === parseInt(item.product_id))
                  return product && parseInt(item.quantity) > (product.quantity ?? 0)
                })}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {creating ? 'Recording...' : paymentStatus === 'partial' ? 'Record Partial Sale' : 'Confirm Sale'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + Summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 space-y-3">
        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {datePresets
            .filter((preset) => !preset.adminOnly || !isStaff)
            .map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset.days)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
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
        {/* Summary */}
        <div className="flex items-center gap-4 text-xs text-neutral-light pt-1 border-t border-gray-50">
          <span>{filteredSales.length} sales</span>
          <span>{totalQty} items</span>
          <span className="font-semibold text-gray-900">GH₵{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : paginatedSales.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium">Product</th>
                    <th className="text-left px-5 py-3 font-medium">Customer</th>
                    <th className="text-left px-5 py-3 font-medium">Sold By</th>
                    <th className="text-center px-5 py-3 font-medium">Qty</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-center px-5 py-3 font-medium">Payment</th>
                    <th className="text-center px-5 py-3 font-medium">Status</th>
                    <th className="text-right px-5 py-3 font-medium">Date</th>
                    {!isStaff && <th className="text-right px-5 py-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((sale) => {
                    const isPartial = sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0
                    const isBorrow = isPartial || sale.payment_status === 'partial' || sale.payment_status === 'borrowed' || sale.payment_status === 'unpaid'
                    const balance = sale.amount - (sale.amount_paid ?? sale.amount)
                    return (
                    <tr key={sale.id} className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => setDetailSale(sale)}>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {isBorrow && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                          {sale.product}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {sale.customer_name ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{sale.customer_name}</span>
                            {isBorrow && sale.customer_phone && (
                              <span className="text-xs text-neutral-light">{sale.customer_phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-light text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {sale.sold_by_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                              {sale.sold_by_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 truncate">{sale.sold_by_name}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-light text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center text-neutral-light">{sale.qty}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                        {sale.amount > 0 ? (
                          `GH₵${sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-neutral-light text-xs">No charge</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment === 'cash' ? 'bg-success-light text-success'
                            : sale.payment === 'mobile_money' ? 'bg-primary-light text-primary'
                            : sale.payment === 'card' ? 'bg-warning-light text-warning'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formatPayment(sale.payment)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isBorrow ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">Partial</span>
                            <span className="text-[10px] text-neutral-light">
                              GH₵{(sale.amount_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} of GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} paid
                            </span>
                            {balance > 0 && (
                              <span className="text-[10px] text-danger font-medium">GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} remaining</span>
                            )}
                          </div>
                        ) : sale.amount_paid != null && sale.amount_paid >= sale.amount ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Paid</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Full</span>
                        )}
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
                  )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {paginatedSales.map((sale) => {
                const isPartial = sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0
                const isBorrow = isPartial || sale.payment_status === 'partial' || sale.payment_status === 'borrowed' || sale.payment_status === 'unpaid'
                const balance = sale.amount - (sale.amount_paid ?? sale.amount)
                return (
                  <div
                    key={sale.id}
                    className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors active:bg-gray-100"
                    onClick={() => setDetailSale(sale)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isBorrow && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                          <p className="font-medium text-gray-900 truncate text-sm">{sale.product}</p>
                        </div>
                        <p className="text-xs text-neutral-light mt-0.5">{sale.time}</p>
                        {(sale.customer_name || sale.customer_phone) && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {sale.customer_name && (
                              <span className="text-xs text-primary font-medium truncate">{sale.customer_name}</span>
                            )}
                            {isBorrow && sale.customer_phone && (
                              <span className="text-xs text-neutral-light truncate">· {sale.customer_phone}</span>
                            )}
                          </div>
                        )}
                        {sale.sold_by_name && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-neutral-light">by</span>
                            <span className="text-xs text-gray-600 truncate">{sale.sold_by_name}</span>
                          </div>
                        )}
                      </div>
                      {isBorrow ? (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-neutral-light line-through">GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm font-bold text-danger">GH₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} left</p>
                        </div>
                      ) : (
                        <p className="font-bold text-gray-900 shrink-0">
                          {sale.amount > 0 ? (
                            `GH₵${sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-neutral-light text-xs font-normal">No charge</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment === 'cash' ? 'bg-success-light text-success'
                            : sale.payment === 'mobile_money' ? 'bg-primary-light text-primary'
                            : sale.payment === 'card' ? 'bg-warning-light text-warning'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formatPayment(sale.payment)}
                        </span>
                        {isBorrow ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">
                            GH₵{(sale.amount_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} of GH₵{sale.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} paid
                          </span>
                        ) : sale.amount_paid != null && sale.amount_paid >= sale.amount ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Paid</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-light">×{sale.qty}</span>
                        {!isStaff && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(sale.id) }}
                            className="text-xs text-danger font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Inline delete confirm */}
                    {deleteConfirm === sale.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(sale.id) }}
                          className="flex-1 py-2 text-xs font-medium text-white bg-danger rounded-lg"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                          className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-neutral-light">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
                  >
                    Prev
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

      {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </div>
  )
}
