'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { saleAPI, productAPI, customerAPI, adminAPI } from '@/lib/api'
import { extractArray, normalizeProduct, mapSale, parseApiError, isStaffRole, isAdminRole, MappedSale, formatPayment, formatCedi } from '@/lib/utils'
import SaleDetailModal from '@/components/SaleDetailModal'
import SaleEditModal from '@/components/SaleEditModal'
import SaleReceiptModal from '@/components/SaleReceiptModal'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ProductCombobox from '@/components/ui/ProductCombobox'
import { PlusIcon, ChartIcon } from '@/components/ui/Icons'
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
  const [editingSale, setEditingSale] = useState<MappedSale | null>(null)
  const [receiptSaleId, setReceiptSaleId] = useState<number | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'fully_paid' | 'partial'>('fully_paid')
  const [amountPaid, setAmountPaid] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [existingCustomers, setExistingCustomers] = useState<any[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [syncFailures, setSyncFailures] = useState<Record<number, string>>({})
  const tempIdRef = useRef(0)
  const retryRef = useRef<Map<number, any>>(new Map())

  const isStaff = isStaffRole(user?.business_role || user?.role)
  const canEditSale = isAdminRole(user?.business_role || user?.role) || user?.business_role === 'cashier' || user?.role === 'cashier'

  const openCustomerPicker = async () => {
    setShowCustomerPicker(true)
    setCustomerSearch('')
    try {
      const res = await customerAPI.list(businessId)
      setExistingCustomers(extractArray(res.data))
    } catch {
      setExistingCustomers([])
    }
  }

  const selectCustomer = (c: any) => {
    setCustomerName(c.name || '')
    setCustomerPhone(c.phone || c.phone_number || c.mobile || '')
    setCustomerEmail(c.email || '')
    setShowCustomerPicker(false)
  }

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return existingCustomers
    const q = customerSearch.toLowerCase()
    return existingCustomers.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || c.phone_number || c.mobile || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [existingCustomers, customerSearch])

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

  const syncFailureCount = Object.keys(syncFailures).length

  const isBlankSaleField = (value?: string) =>
    value === undefined || value === null || value === '' || value === 'Unknown' || /^Product #\d+$/.test(value)

  const mergeConfirmedSale = (optimistic: MappedSale, saved: MappedSale): MappedSale => {
    const merged: MappedSale = { ...optimistic, ...saved, id: saved.id, pending: false }
    for (const field of ['product', 'customer_name', 'customer_phone', 'sold_by_name'] as const) {
      if (isBlankSaleField(saved[field]) && !isBlankSaleField(optimistic[field])) {
        ;(merged as unknown as Record<string, unknown>)[field] = optimistic[field]
      }
    }
    if (!merged.sales_items?.length && optimistic.sales_items?.length) {
      merged.sales_items = optimistic.sales_items
    }
    return merged
  }

  const sendSale = async (tempId: number, payload: any) => {
    try {
      const res = await saleAPI.record(businessId, payload)
      const raw = res.data?.data ?? res.data
      const saved = mapSale(raw)
      setAllSales((prev) => prev.map((s) => (s.id === tempId ? mergeConfirmedSale(s, saved) : s)))
      retryRef.current.delete(tempId)
      setSyncFailures((prev) => {
        if (!(tempId in prev)) return prev
        const next = { ...prev }
        delete next[tempId]
        return next
      })
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const message = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || d.message || d.detail || String(d)).join(', ')
        : typeof detail === 'string'
          ? detail
          : 'Failed to record sale'
      setSyncFailures((prev) => ({ ...prev, [tempId]: message }))
      setSuccess('')
      setError(`Sale not saved: ${message}`)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || validLineItems.length === 0) return
    setError('')
    setSuccess('')

    const items = validLineItems.map((item) => ({
      product_id: parseInt(item.product_id),
      quantity: parseInt(item.quantity),
    }))
    const paid = effectiveAmountPaid
    const name = customerName.trim()
    const phone = customerPhone.trim()
    const email = customerEmail.trim()
    const method = paymentMethod
    const status = paymentStatus
    const total = formTotal

    tempIdRef.current -= 1
    const tempId = tempIdRef.current

    const optimistic: MappedSale = {
      id: tempId,
      product:
        items
          .map((i) => products.find((p) => p.product_id === i.product_id)?.name || `Product #${i.product_id}`)
          .join(', ') || 'Unknown',
      qty: items.reduce((s, i) => s + i.quantity, 0),
      amount: total,
      payment: method.toLowerCase(),
      time: new Date().toLocaleString(),
      created_at: new Date().toISOString(),
      amount_paid: paid,
      payment_status: status,
      customer_name: name || undefined,
      customer_phone: phone || undefined,
      pending: true,
    }

    setAllSales((prev) => [optimistic, ...prev])
    setProducts((prev) =>
      prev.map((p) => {
        const sold = items.find((i) => i.product_id === p.product_id)
        return sold ? { ...p, quantity: p.quantity - sold.quantity } : p
      })
    )

    setLineItems([{ product_id: '', quantity: '' }])
    setPaymentMethod('cash')
    setPaymentStatus('fully_paid')
    setAmountPaid('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setShowForm(false)
    setSuccess('Sale saved')

    const payload: any = { list_items: items, amount_paid: paid, payment_method: method }

    const resolveCustomer = async (): Promise<number | null> => {
      if (status !== 'partial' || !name || !phone) return null
      try {
        const customersRes = await customerAPI.list(businessId)
        const existing = extractArray(customersRes.data).find(
          (c: any) => (c.phone || c.phone_number || c.mobile || '') === phone
        )
        if (existing) return existing.customer_id ?? existing.id
      } catch {
      }
      const customerPayload: any = { name, phone }
      if (email) customerPayload.email = email
      const created = await customerAPI.create(businessId, customerPayload)
      return created.data?.customer_id ?? created.data?.id
    }

    retryRef.current.set(tempId, { items, paid, method, name, phone, email, status })
    void (async () => {
      let customerId: number | null = null
      try {
        customerId = await resolveCustomer()
      } catch {
        setSyncFailures((prev) => ({ ...prev, [tempId]: 'Failed to save customer' }))
        setSuccess('')
        setError('Sale not saved: could not save the customer. Retry from the failed sale.')
        return
      }
      const finalPayload = { ...payload, ...(customerId != null ? { customer_id: customerId } : {}) }
      await sendSale(tempId, finalPayload)
    })()
  }

  const retrySale = async (tempId: number) => {
    const saved = retryRef.current.get(tempId)
    if (!saved || !businessId) return
    setSyncFailures((prev) => {
      const next = { ...prev }
      delete next[tempId]
      return next
    })
    const payload: any = {
      list_items: saved.items,
      amount_paid: saved.paid,
      payment_method: saved.method,
    }
    if (saved.status === 'partial' && saved.name && saved.phone) {
      try {
        const customersRes = await customerAPI.list(businessId)
        const existing = extractArray(customersRes.data).find(
          (c: any) => (c.phone || c.phone_number || c.mobile || '') === saved.phone
        )
        const customerId =
          existing?.customer_id ??
          existing?.id ??
          (await customerAPI.create(businessId, { name: saved.name, phone: saved.phone })).data?.customer_id
        if (customerId != null) payload.customer_id = customerId
      } catch {
        setSyncFailures((prev) => ({ ...prev, [tempId]: 'Failed to save customer' }))
        return
      }
    }
    await sendSale(tempId, payload)
  }

  const discardSale = (tempId: number) => {
    const saved = retryRef.current.get(tempId)
    retryRef.current.delete(tempId)
    if (saved?.items) {
      setProducts((prev) =>
        prev.map((p) => {
          const sold = saved.items.find((i: any) => i.product_id === p.product_id)
          return sold ? { ...p, quantity: p.quantity + sold.quantity } : p
        })
      )
    }
    setAllSales((prev) => prev.filter((s) => s.id !== tempId))
    setSyncFailures((prev) => {
      const next = { ...prev }
      delete next[tempId]
      return next
    })
  }

  const handleDetail = async (sale: SaleRecord) => {
    setDetailSale(sale)
    try {
      const res = await saleAPI.get(businessId, sale.id)
      const raw = res.data?.data ?? res.data
      const enriched = mapSale(raw)
      const merged: any = { ...sale }
      Object.entries(enriched).forEach(([key, val]: any) => {
        if (val !== undefined && val !== null && val !== '') merged[key] = val
      })
      setDetailSale(merged)
    } catch {
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

  const toggleSelect = (id: number) => {
    setSelectedSales((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const ids = paginatedSales.map((s) => s.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedSales.has(id))
    setSelectedSales((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const clearSelection = () => {
    setSelectedSales(new Set())
    setSelectMode(false)
  }

  const handleBulkDelete = () => {
    if (selectedSales.size === 0) return
    const idsToDelete = new Set(selectedSales)
    setBulkDeleteConfirm(false)
    setAllSales((prev) => prev.filter((s) => !idsToDelete.has(s.id)))
    setSelectedSales(new Set())
    setSelectMode(false)
    setSuccess(`${idsToDelete.size} sale${idsToDelete.size > 1 ? 's' : ''} deleted`)
    let failed = 0
    Array.from(idsToDelete).forEach((id) => {
      saleAPI.delete(businessId, id).catch(() => { failed++ })
    })
    setTimeout(() => {
      if (failed > 0) {
        setError(`${failed} sale${failed > 1 ? 's' : ''} failed to delete`)
        loadData()
      }
    }, 500)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Transactions"
        title="Sales"
        subtitle="Record and view your sales"
        actions={
          <Button onClick={() => setShowForm(!showForm)} leftIcon={<PlusIcon className="w-4 h-4" />}>
            Record Sale
          </Button>
        }
      />

      {/* Alerts */}
      {error && (
        <Alert kind="error">{error}</Alert>
      )}
      {success && (
        <Alert kind="success">{success}</Alert>
      )}
      {syncFailureCount > 0 && (
        <Alert kind="error">
          <div className="space-y-2">
            <p className="font-semibold">
              {syncFailureCount} sale{syncFailureCount > 1 ? 's' : ''} did not save
            </p>
            {Object.entries(syncFailures).map(([tempId, message]) => (
              <div key={tempId} className="flex flex-wrap items-center gap-2 text-sm">
                <span>{message}</span>
                <button
                  type="button"
                  onClick={() => retrySale(Number(tempId))}
                  className="rounded-lg bg-white px-2 py-1 font-medium"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => discardSale(Number(tempId))}
                  className="rounded-lg bg-white px-2 py-1 font-medium"
                >
                  Discard
                </button>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Record Sale Form */}
      {showForm && (
        <div className="surface-card animate-fade-up p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-section-title text-slate-900">Record New Sale</h2>
              <p className="mt-0.5 text-xs text-neutral-light">
                Search your inventory and set a quantity for each item.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              aria-label="Close sale form"
              className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-3">
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Products</label>
              {lineItems.map((item, idx) => {
                const selectedIds = lineItems.filter((li) => li.product_id).map((li) => li.product_id)
                const availableProducts = products.filter((p) => !selectedIds.includes(String(p.product_id)) || p.product_id === parseInt(item.product_id))
                const currentItemProduct = products.find((p) => p.product_id === parseInt(item.product_id))
                return (
                  <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <ProductCombobox
                      id={`line-product-${idx}`}
                      className="flex-1"
                      products={availableProducts}
                      value={item.product_id}
                      onChange={(pid) => {
                        const updated = [...lineItems]
                        updated[idx] = { ...updated[idx], product_id: pid }
                        setLineItems(updated)
                      }}
                      excludeIds={selectedIds}
                      placeholder={idx === 0 ? 'Search products by name, SKU or category' : 'Search for another product'}
                    />
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          id={`line-qty-${idx}`}
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
                const product = products.find((p) => p.product_id === parseInt(item.product_id))
                return product && parseInt(item.quantity) > (product.quantity ?? 0)
              }) && (
                <p
                  role="alert"
                  className="flex items-center gap-1.5 text-xs font-medium text-danger"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-8-4a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  One or more items exceed available stock
                </p>
              )}
              <button
                type="button"
                onClick={() => setLineItems([...lineItems, { product_id: '', quantity: '' }])}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-neutral-light transition-all duration-150 hover:border-primary hover:bg-primary-light/40 hover:text-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
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
                  onClick={() => { setPaymentStatus('fully_paid'); setAmountPaid('') }}
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
                    max={formTotal}
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
                    onClick={openCustomerPicker}
                    className="text-xs font-medium text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Pick Existing
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer's full name"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com (optional)"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="024XXXXXXX"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                {isPartialPayment && (
                  <div className="px-4 py-3 rounded-xl bg-warning-light border border-warning/20">
                    <p className="text-xs text-warning font-medium">
                      Balance: {formatCedi(formTotal - effectiveAmountPaid)} remaining
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
                      <span className="text-slate-600">{product.name} × {qty}</span>
                      <span className="font-medium text-slate-900">{formatCedi(product.price * qty)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-slate-200 mt-2 pt-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Total Amount</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatCedi(formTotal)}</p>
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
                disabled={validLineItems.length === 0 || lineItems.some((item) => {
                  const product = products.find((p) => p.product_id === parseInt(item.product_id))
                  return product && parseInt(item.quantity) > (product.quantity ?? 0)
                })}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {paymentStatus === 'partial' ? 'Record Partial Sale' : 'Confirm Sale'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 space-y-3">
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
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => showDatePicker ? setShowDatePicker(false) : handleOpenDatePicker()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Custom
            </button>
            {showDatePicker && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">From</label>
                    <input
                      type="date"
                      value={draftDateFilter.start}
                      onChange={(e) => setDraftDateFilter((prev) => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">To</label>
                    <input
                      type="date"
                      value={draftDateFilter.end}
                      onChange={(e) => setDraftDateFilter((prev) => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-primary outline-none"
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
        <div className="flex items-center gap-4 text-xs text-neutral-light pt-1 border-t border-slate-50">
          <span>{filteredSales.length} sales</span>
          <span>{totalQty} items</span>
          <span className="font-semibold text-slate-900">{formatCedi(totalAmount)}</span>
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!isStaff && !selectMode && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-900">Sales</span>
            <button
              onClick={() => { setSelectMode(true); setSelectedSales(new Set()) }}
              className="text-xs font-medium text-primary hover:text-primary-dark transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Bulk Select
            </button>
          </div>
        )}
        {selectMode && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-primary/20 bg-primary/5">
            <label className="flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={paginatedSales.length > 0 && paginatedSales.every((s) => selectedSales.has(s.id))}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              Select all on page
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">{selectedSales.size} selected</span>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={selectedSales.size === 0}
                className="px-3 py-1.5 text-xs font-medium text-white bg-danger rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete ({selectedSales.size})
              </button>
            </div>
          </div>
        )}
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
                  <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-slate-200">
                    {selectMode && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={paginatedSales.length > 0 && paginatedSales.every((s) => selectedSales.has(s.id))}
                          onChange={toggleSelectAll}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      </th>
                    )}
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
                    <tr key={sale.id} className="border-t border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => handleDetail(sale)}>
                    {selectMode && (
                      <td className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedSales.has(sale.id)}
                          onChange={() => toggleSelect(sale.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {isBorrow && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                          {sale.product}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {sale.customer_name ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{sale.customer_name}</span>
                            {isBorrow && sale.customer_phone && (
                              <span className="text-xs text-neutral-light">{sale.customer_phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-light text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {sale.sold_by_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                              {sale.sold_by_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-900 truncate">{sale.sold_by_name}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-light text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center text-neutral-light">{sale.qty}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                        {sale.amount > 0 ? (
                          formatCedi(sale.amount)
                        ) : (
                          <span className="text-neutral-light text-xs">No charge</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment === 'cash' ? 'bg-success-light text-success'
                            : sale.payment === 'mobile_money' ? 'bg-primary-light text-primary'
                            : sale.payment === 'card' ? 'bg-warning-light text-warning'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {formatPayment(sale.payment)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isBorrow ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">Partial</span>
                            <span className="text-[10px] text-neutral-light">
                            {formatCedi(sale.amount_paid ?? 0)} of {formatCedi(sale.amount)} paid
                          </span>
                            {balance > 0 && (
                              <span className="text-[10px] text-danger font-medium">{formatCedi(balance)} remaining</span>
                            )}
                          </div>
                        ) : sale.amount_paid != null && sale.amount_paid >= sale.amount ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Paid</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Full</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-neutral-light text-xs">{sale.time}</td>
                      {!isStaff && (
                        <td className="px-5 py-3.5 text-right">
                          {deleteConfirm === sale.id ? (
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(sale.id) }}
                                className="px-2 py-1 text-xs font-medium text-white bg-danger rounded-lg"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                                className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(sale.id) }}
                              className="text-xs text-danger hover:underline font-medium"
                            >
                              Delete
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setReceiptSaleId(sale.id) }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Receipt
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-50">
              {paginatedSales.map((sale) => {
                const isPartial = sale.amount_paid != null && sale.amount_paid < sale.amount && sale.amount > 0
                const isBorrow = isPartial || sale.payment_status === 'partial' || sale.payment_status === 'borrowed' || sale.payment_status === 'unpaid'
                const balance = sale.amount - (sale.amount_paid ?? sale.amount)
                return (
                  <div
                    key={sale.id}
                    className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors active:bg-slate-100"
                    onClick={() => handleDetail(sale)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {selectMode && (
                        <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSales.has(sale.id)}
                            onChange={() => toggleSelect(sale.id)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isBorrow && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />}
                          <p className="font-medium text-slate-900 truncate text-sm">{sale.product}</p>
                        </div>
                        <p className="text-xs text-neutral-light mt-0.5">{sale.time}</p>
                        {sale.pending && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-light mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                            Saving…
                          </span>
                        )}
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
                            <span className="text-xs text-slate-600 truncate">{sale.sold_by_name}</span>
                          </div>
                        )}
                      </div>
                      {isBorrow ? (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-neutral-light line-through">{formatCedi(sale.amount)}</p>
                          <p className="text-sm font-bold text-danger">{formatCedi(balance)} left</p>
                        </div>
                      ) : (
                        <p className="font-bold text-slate-900 shrink-0">
                          {sale.amount > 0 ? (
                            formatCedi(sale.amount)
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
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {formatPayment(sale.payment)}
                        </span>
                        {isBorrow ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">
                            {formatCedi(sale.amount_paid ?? 0)} of {formatCedi(sale.amount)} paid
                          </span>
                        ) : sale.amount_paid != null && sale.amount_paid >= sale.amount ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">Paid</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-light">×{sale.qty}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReceiptSaleId(sale.id) }}
                          className="text-xs text-primary font-medium"
                        >
                          Receipt
                        </button>
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
                          className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
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
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs text-neutral-light">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<ChartIcon className="w-6 h-6 text-primary" />}
            title={dateFilter.start || dateFilter.end ? 'No sales found for the selected date range' : 'No sales recorded yet'}
            description={dateFilter.start || dateFilter.end ? 'Try adjusting your date filters' : 'Record your first sale to get started'}
            action={!dateFilter.start && !dateFilter.end && (
              <Button size="sm" onClick={() => setShowForm(true)} leftIcon={<PlusIcon className="w-3.5 h-3.5" />}>
                Add Sale
              </Button>
            )}
          />
        )}
      </div>

      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          canEdit={canEditSale}
          onEdit={() => { setEditingSale(detailSale); setDetailSale(null) }}
        />
      )}

      {editingSale && (
        <SaleEditModal
          sale={editingSale}
          businessId={businessId}
          onClose={() => setEditingSale(null)}
          onSaved={() => {
            setEditingSale(null)
            setSuccess('Sale updated successfully!')
            loadData()
          }}
        />
      )}

      {receiptSaleId != null && (
        <SaleReceiptModal
          businessId={businessId}
          saleId={receiptSaleId}
          onClose={() => setReceiptSaleId(null)}
        />
      )}

      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBulkDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-xl bg-danger/10 flex items-center justify-center text-danger mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 text-lg mb-1">Delete Sales</h3>
            <p className="text-sm text-neutral-light mb-5">
              Are you sure you want to delete <strong>{selectedSales.size}</strong> selected sale{selectedSales.size > 1 ? 's' : ''}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showCustomerPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCustomerPicker(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="font-semibold text-slate-900">Select Customer</h3>
                <p className="text-xs text-neutral-light mt-0.5">{existingCustomers.length} customers available</p>
              </div>
              <button onClick={() => setShowCustomerPicker(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCustomers.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {filteredCustomers.map((c: any) => (
                    <button
                      key={c.customer_id ?? c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-5 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(c.phone || c.phone_number) && (
                            <span className="text-xs text-neutral-light">{c.phone || c.phone_number}</span>
                          )}
                          {c.email && (
                            <span className="text-xs text-neutral-light truncate">{c.email}</span>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-neutral-light">{customerSearch ? 'No customers match your search' : 'No customers yet'}</p>
                  {!customerSearch && (
                    <p className="text-xs text-neutral-light mt-1">Customers are created automatically when you record partial sales</p>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl sm:rounded-b-2xl">
              <button
                type="button"
                onClick={() => { setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setShowCustomerPicker(false) }}
                className="w-full py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Enter manually instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
