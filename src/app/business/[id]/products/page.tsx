'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { productAPI } from '@/lib/api'
import { normalizeProduct, extractArray, parseApiError, isAdminRole, formatCedi, isDeletedProduct, formatDeletedAt } from '@/lib/utils'
import {
  filterProducts,
  inventoryStatus,
  lowStockThreshold,
  marginPercent,
  productQuantity,
  sortProducts,
  stockLevelPercent,
  stockValue,
  summarizeInventory,
  type InventoryStatus,
  type ProductSortKey,
  type ProductView,
  type SortDirection,
  type StockFilter,
} from '@/lib/products'
import type { Product } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import ProductDetailModal from '@/components/ProductDetailModal'
import ProductUploadModal from '@/components/ProductUploadModal'
import BarcodeScanModal from '@/components/BarcodeScanModal'
import KpiCard from '@/components/KpiCard'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import {
  AlertTriangleIcon,
  BoxIcon,
  CashIcon,
  ChartIcon,
  PlusIcon,
  ScanIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from '@/components/ui/Icons'

const STOCK_META: Record<
  InventoryStatus,
  {
    label: string
    color: 'emerald' | 'amber' | 'red'
    bar: string
    text: string
    avatar: string
  }
> = {
  in_stock: {
    label: 'In stock',
    color: 'emerald',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
    avatar: 'bg-emerald-50 text-emerald-700',
  },
  low_stock: {
    label: 'Low stock',
    color: 'amber',
    bar: 'bg-amber-500',
    text: 'text-amber-700',
    avatar: 'bg-amber-50 text-amber-700',
  },
  out_of_stock: {
    label: 'Out of stock',
    color: 'red',
    bar: 'bg-rose-500',
    text: 'text-rose-700',
    avatar: 'bg-rose-50 text-rose-700',
  },
}

const SORT_OPTIONS: { key: ProductSortKey; direction: SortDirection; label: string }[] = [
  { key: 'name', direction: 'asc', label: 'Name A–Z' },
  { key: 'name', direction: 'desc', label: 'Name Z–A' },
  { key: 'quantity', direction: 'asc', label: 'Stock: low to high' },
  { key: 'quantity', direction: 'desc', label: 'Stock: high to low' },
  { key: 'value', direction: 'desc', label: 'Stock value: high to low' },
  { key: 'margin', direction: 'desc', label: 'Margin: high to low' },
  { key: 'price', direction: 'desc', label: 'Price: high to low' },
]

function sortValue(key: ProductSortKey, direction: SortDirection): string {
  return `${key}:${direction}`
}

const EMPTY_PRODUCT_FORM = {
  name: '',
  price: '',
  cost_price: '',
  quantity: '',
  unit: 'units',
  low_stock_threshold: '10',
  category: '',
  description: '',
  sku: '',
  barcode: '',
}

export default function ProductsPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ProductSortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadNotice, setUploadNotice] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [productView, setProductView] = useState<ProductView>('active')
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({ ...EMPTY_PRODUCT_FORM })
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockQty, setRestockQty] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!businessId || isNaN(businessId)) return
    if (!silent) setLoading(true)
    try {
      const res = await productAPI.list(businessId)
      const items = extractArray(res.data).map(normalizeProduct)
      setAllProducts(items)
      const cats = [...new Set(items.filter(p => !isDeletedProduct(p)).map(p => p.category).filter(Boolean))] as string[]
      setCategories(cats)
      setError('')
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [businessId])

  useEffect(() => { if (businessId) load() }, [businessId, load])

  const activeProducts = useMemo(() => allProducts.filter(p => !isDeletedProduct(p)), [allProducts])
  const deletedProducts = useMemo(() => allProducts.filter(p => isDeletedProduct(p)), [allProducts])

  const inventory = useMemo(() => summarizeInventory(activeProducts), [activeProducts])

  const displayed = useMemo(() => {
    const scoped = productView === 'deleted' ? deletedProducts : activeProducts
    const filtered = filterProducts(scoped, {
      search,
      category: productView === 'active' ? selectedCategory : '',
      status: productView === 'active' ? stockFilter : 'all',
    })
    return sortProducts(filtered, sortKey, sortAsc ? 'asc' : 'desc')
  }, [activeProducts, deletedProducts, productView, search, sortKey, sortAsc, selectedCategory, stockFilter])

  const handleSort = (key: ProductSortKey) => {
    if (sortKey === key) setSortAsc((asc) => !asc)
    else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  const selectStockFilter = (filter: StockFilter) => {
    setProductView('active')
    setStockFilter(filter)
  }

  const sortSelection = sortValue(sortKey, sortAsc ? 'asc' : 'desc')
  const setSortSelection = (value: string) => {
    const [key, direction] = value.split(':') as [ProductSortKey, SortDirection]
    setSortKey(key)
    setSortAsc(direction === 'asc')
  }

  const openAdd = () => {
    setForm({ ...EMPTY_PRODUCT_FORM })
    setEditProduct(null)
    setShowAdd(true)
  }

  const openEdit = (p: Product) => {
    setForm({
      name: p.name || '', price: String(p.price ?? ''), cost_price: String(p.cost_price ?? ''),
      quantity: String(p.quantity ?? ''), unit: p.unit || 'units',
      low_stock_threshold: String(p.low_stock_threshold ?? 10), category: p.category || '',
      description: p.description || '', sku: p.sku || '', barcode: p.barcode || '',
    })
    setEditProduct(p)
    setShowAdd(true)
  }

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      quantity: parseInt(form.quantity) || 0,
      unit: form.unit || 'units',
      low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      category: form.category || undefined,
      description: form.description || undefined,
      sku: form.sku || undefined,
      barcode: form.barcode.trim() || null,
    }

    // Close the form and paint the change straight away. The server call runs
    // in the background and only rolls the row back if it actually fails.
    setShowAdd(false)
    setError('')
    setUploadNotice('')

    if (editProduct) {
      const previous = editProduct
      const optimistic: Product = { ...previous, ...payload }
      setAllProducts(prev => prev.map(p => (p.product_id === previous.product_id ? optimistic : p)))
      productAPI.update(businessId!, previous.product_id, payload)
        .then(() => setUploadNotice(`${payload.name} updated`))
        .catch((err: any) => {
          setAllProducts(prev => prev.map(p => (p.product_id === previous.product_id ? previous : p)))
          setUploadNotice('')
          setError(parseApiError(err) || 'Failed to update product')
        })
      return
    }

    const tempId = -Date.now()
    const optimistic: Product = { ...payload, product_id: tempId, is_active: true }
    setAllProducts(prev => [optimistic, ...prev])
    if (payload.category) {
      const category = payload.category
      setCategories(prev => (prev.includes(category) ? prev : [...prev, category]))
    }
    setUploadNotice(`${payload.name} added`)
    productAPI.create(businessId!, payload)
      .then((res) => {
        const raw = res.data?.data ?? res.data
        const created = raw?.product ?? raw
        if (created && (created.product_id ?? created.id) != null) {
          const normalized = normalizeProduct({ ...payload, ...created })
          setAllProducts(prev => prev.map(p => (p.product_id === tempId ? normalized : p)))
        } else {
          // Some deployments only return a success message; sync quietly.
          setAllProducts(prev => prev.filter(p => p.product_id !== tempId))
          load(true)
        }
      })
      .catch((err: any) => {
        setAllProducts(prev => prev.filter(p => p.product_id !== tempId))
        setUploadNotice('')
        setError(parseApiError(err) || 'Failed to add product')
      })
  }

  const handleDelete = () => {
    if (!deleteConfirm.product) return
    const product = deleteConfirm.product
    const productId = product.product_id
    setDeleteConfirm({ open: false, product: null })
    setAllProducts(prev => prev.filter(p => p.product_id !== productId))
    setUploadNotice(`${product.name} deleted`)
    productAPI.delete(businessId!, productId).catch((err: any) => {
      setAllProducts(prev => [...prev, product])
      setError(parseApiError(err) || 'Failed to delete product')
    })
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const ids = displayed.map(p => p.product_id)
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
    setSelectMode(false)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false)
      }
    }
    if (showExportDropdown) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportDropdown])

  const handleExport = async (format: 'csv' | 'excel') => {
    setShowExportDropdown(false)
    setExporting(true)
    try {
      const res = await productAPI.export(businessId, format)
      const blob = new Blob([res.data as BlobPart], {
        type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'csv' ? 'products.csv' : 'products.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setUploadNotice(`Products exported as ${format.toUpperCase()}`)
    } catch (err: any) {
      setError(parseApiError(err) || 'Failed to export products')
    } finally {
      setExporting(false)
    }
  }

  const handleBulkDelete = () => {
    if (selected.size === 0) return
    const idsToDelete = new Set(selected)
    const removedProducts = allProducts.filter(p => idsToDelete.has(p.product_id))
    setBulkDeleteConfirm(false)
    setAllProducts(prev => prev.filter(p => !idsToDelete.has(p.product_id)))
    setSelected(new Set())
    setSelectMode(false)
    setUploadNotice(`${idsToDelete.size} product${idsToDelete.size > 1 ? 's' : ''} deleted`)
    let failed = 0
    const promises = Array.from(idsToDelete).map(id =>
      productAPI.delete(businessId!, id).catch(() => { failed++ })
    )
    Promise.all(promises).then(() => {
      if (failed > 0) {
        setAllProducts(prev => [...prev, ...removedProducts.filter(p => idsToDelete.has(p.product_id))])
        setError(`${failed} product${failed > 1 ? 's' : ''} failed to delete`)
        load()
      }
    })
  }

  const openRestock = (p: Product) => {
    setRestockProduct(p)
    setRestockQty('')
    setShowRestockModal(true)
  }

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !restockProduct) return
    const qty = parseInt(restockQty)
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity to add')
      return
    }
    const target = restockProduct
    setShowRestockModal(false)
    setRestockProduct(null)
    setError('')
    setUploadNotice('')
    setAllProducts(prev => prev.map(p =>
      p.product_id === target.product_id
        ? { ...p, quantity: (p.quantity ?? 0) + qty }
        : p
    ))
    setUploadNotice(`${qty} ${target.unit || 'units'} added to ${target.name}`)
    productAPI.restock(businessId, target.product_id, qty)
      .then((res) => {
        const updated = res.data?.data ?? res.data
        if (updated?.quantity != null) {
          setAllProducts(prev => prev.map(p =>
            p.product_id === target.product_id ? { ...p, quantity: updated.quantity } : p
          ))
        }
      })
      .catch((err: any) => {
        setAllProducts(prev => prev.map(p =>
          p.product_id === target.product_id ? { ...p, quantity: target.quantity } : p
        ))
        setUploadNotice('')
        setError(parseApiError(err) || 'Failed to restock product')
      })
  }

  const handleToggleActive = async (p: Product) => {
    const nextActive = !p.is_active
    setAllProducts(prev => prev.map(x => x.product_id === p.product_id ? { ...x, is_active: nextActive } : x))
    try {
      await productAPI.deactivate(businessId!, p.product_id)
      setUploadNotice(`${p.name} ${nextActive ? 'reactivated' : 'deactivated'}`)
    } catch (err: any) {
      setAllProducts(prev => prev.map(x => x.product_id === p.product_id ? { ...x, is_active: !nextActive } : x))
      setError(parseApiError(err) || 'Failed to update product status')
    }
  }

  const canEdit = isAdminRole(user?.business_role || user?.role)

  const handleScannedProduct = (p: Product) => {
    setShowScan(false)
    setAllProducts(prev =>
      prev.some(x => x.product_id === p.product_id)
        ? prev.map(x => (x.product_id === p.product_id ? { ...x, ...p } : x))
        : [p, ...prev]
    )
    setDetailProduct(p)
  }

  const handleScanSuggestion = (code: string, suggestedName: string) => {
    setShowScan(false)
    if (!canEdit) return
    setForm({ ...EMPTY_PRODUCT_FORM, name: suggestedName, barcode: code })
    setEditProduct(null)
    setShowAdd(true)
    setUploadNotice(`Barcode matched “${suggestedName}” in Open Food Facts. Add a price and stock to save it.`)
  }

  const handleScanCreate = (code: string) => {
    setShowScan(false)
    if (!canEdit) return
    setForm({ ...EMPTY_PRODUCT_FORM, barcode: code })
    setEditProduct(null)
    setShowAdd(true)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Products"
        subtitle={
          loading
            ? 'Loading your inventory…'
            : `${inventory.total} products · ${inventory.totalUnits.toLocaleString()} units on hand · ${formatCedi(inventory.costValue)} at cost`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowScan(true)}
              leftIcon={<ScanIcon className="w-4 h-4" />}
            >
              Scan
            </Button>
            <div ref={exportRef} className="relative">
              <Button
                variant="secondary"
                disabled={exporting || loading || allProducts.length === 0}
                onClick={() => setShowExportDropdown((v) => !v)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                }
              >
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-40 py-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Excel
                  </button>
                </div>
              )}
            </div>
            {canEdit && (
              <>
                <Button variant="secondary" onClick={() => setShowUpload(true)} leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                }>
                  Import
                </Button>
                <Button onClick={openAdd} leftIcon={<PlusIcon className="w-4 h-4" />}>
                  Add Product
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          title="Products"
          value={inventory.total}
          subtitle={`${inventory.totalUnits.toLocaleString()} units on hand`}
          icon={<BoxIcon className="h-5 w-5" />}
          color="primary"
          loading={loading}
        />
        <KpiCard
          title="Inventory value"
          value={formatCedi(inventory.costValue)}
          subtitle={`${formatCedi(inventory.retailValue)} retail · ${inventory.blendedMargin.toFixed(1)}% margin`}
          icon={<CashIcon className="h-5 w-5" />}
          color="success"
          loading={loading}
        />
        <KpiCard
          title="Low stock"
          value={inventory.lowStock}
          subtitle={
            inventory.lowStock > 0
              ? `At or below reorder point${inventory.lowStock === 1 ? '' : 's'}`
              : 'Everything is above threshold'
          }
          icon={<AlertTriangleIcon className="h-5 w-5" />}
          color="warning"
          loading={loading}
        />
        <KpiCard
          title="Out of stock"
          value={inventory.outOfStock}
          subtitle={
            inventory.outOfStock > 0
              ? `${inventory.inactive} inactive product${inventory.inactive === 1 ? '' : 's'} in catalogue`
              : 'All stocked items are available'
          }
          icon={<ChartIcon className="h-5 w-5" />}
          color="danger"
          loading={loading}
        />
      </div>

      <div className="surface-card overflow-hidden">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
              <button
                type="button"
                onClick={() => { setProductView('active'); clearSelection() }}
                aria-pressed={productView === 'active'}
                className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors sm:flex-none ${
                  productView === 'active'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Products
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    productView === 'active' ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  {activeProducts.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setProductView('deleted'); clearSelection() }}
                aria-pressed={productView === 'deleted'}
                className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors sm:flex-none ${
                  productView === 'deleted'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Deleted
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                    productView === 'deleted' ? 'bg-rose-50 text-rose-600' : 'bg-slate-200/70 text-slate-500'
                  }`}
                >
                  {deletedProducts.length}
                </span>
              </button>
            </div>

            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-light" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, or category..."
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-xs outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              disabled={productView === 'deleted'}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition-all hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={sortSelection}
              onChange={(e) => setSortSelection(e.target.value)}
              aria-label="Sort products"
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition-all hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={sortValue(option.key, option.direction)} value={sortValue(option.key, option.direction)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            {productView === 'active' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { key: 'all' as StockFilter, label: 'All products', count: inventory.total },
                  { key: 'in_stock' as StockFilter, label: 'In stock', count: inventory.inStock },
                  { key: 'low_stock' as StockFilter, label: 'Low stock', count: inventory.lowStock },
                  { key: 'out_of_stock' as StockFilter, label: 'Out of stock', count: inventory.outOfStock },
                ]).map((filter) => {
                  const active = stockFilter === filter.key
                  const tone =
                    filter.key === 'all'
                      ? 'bg-primary-light text-primary ring-primary/20'
                      : filter.key === 'in_stock'
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        : filter.key === 'low_stock'
                          ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                          : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectStockFilter(filter.key)}
                      className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-colors ${
                        active ? tone : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {filter.label}
                      <span className="tabular-nums opacity-75">{filter.count}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-light">
                Deleted products are read-only and kept for historical sales.
              </p>
            )}
            <p className="text-xs text-neutral-light">
              {productView === 'active' ? (
                stockFilter === 'all' ? (
                  `${displayed.length} product${displayed.length === 1 ? '' : 's'} shown`
                ) : (
                  `${displayed.length} ${STOCK_META[stockFilter].label.toLowerCase()} product${displayed.length === 1 ? '' : 's'}`
                )
              ) : (
                `${displayed.length} deleted product${displayed.length === 1 ? '' : 's'}`
              )}
            </p>
          </div>
        </div>

        {productView === 'active' && inventory.total > 0 && (
          <div className="grid grid-cols-3 border-t border-slate-100">
            {(['in_stock', 'low_stock', 'out_of_stock'] as InventoryStatus[]).map((status) => {
              const meta = STOCK_META[status]
              const count = status === 'in_stock' ? inventory.inStock : status === 'low_stock' ? inventory.lowStock : inventory.outOfStock
              const share = inventory.total > 0 ? Math.round((count / inventory.total) * 100) : 0
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => selectStockFilter(status)}
                  aria-pressed={stockFilter === status}
                  className={`border-l border-slate-100 px-4 py-3 text-left transition-colors first:border-l-0 hover:bg-slate-50 ${
                    stockFilter === status ? 'bg-slate-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-micro uppercase tracking-[0.08em] text-neutral-light">
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.bar}`} aria-hidden="true" />
                    {meta.label}
                  </span>
                  <span className={`mt-1 block text-base font-semibold ${meta.text}`}>{count}</span>
                  <span className="text-[11px] text-neutral-light">{share}% of catalogue</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {productView === 'deleted' && !loading && (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
          <svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <div>
            <p className="text-sm font-medium text-slate-900">Deleted products</p>
            <p className="text-xs text-neutral-light mt-0.5">These products are hidden from your inventory and can no longer be sold. Past sales still reference them.</p>
          </div>
        </div>
      )}

      {/* Bulk selection bar */}
      {canEdit && !loading && productView === 'active' && displayed.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${
            selectMode || selected.size > 0
              ? 'border-primary/40 bg-primary-light/40 ring-2 ring-primary/10'
              : 'border-slate-200 bg-white'
          }`}
        >
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={displayed.length > 0 && displayed.every((p) => selected.has(p.product_id))}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
            />
            <span className="font-medium">Select all shown</span>
          </label>

          {selected.size > 0 && (
            <>
              <span className="text-sm text-neutral-light">
                <span className="font-semibold text-slate-900">{selected.size}</span> selected
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="dangerOutline"
                  size="sm"
                  onClick={() => setBulkDeleteConfirm(true)}
                  leftIcon={<TrashIcon className="h-3.5 w-3.5" />}
                >
                  Delete selected
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert kind="error">{error}</Alert>
      )}

      {/* Upload success notice */}
      {uploadNotice && (
        <Alert kind="success" icon={
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        }>
          {uploadNotice}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="surface-card flex items-center justify-between gap-3 p-4">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-9 w-28 rounded-xl" />
          </div>
          <div className="surface-card overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
                <div className="skeleton h-9 w-9 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
                <div className="skeleton hidden h-4 w-20 sm:block" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && displayed.length === 0 && (
        <div className="surface-card">
          <EmptyState
            icon={<BoxIcon className="w-6 h-6 text-primary" />}
            title={
              productView === 'deleted'
                ? 'No deleted products'
                : activeProducts.length === 0
                  ? 'Your inventory is empty'
                  : 'No products match these filters'
            }
            description={
              productView === 'deleted'
                ? 'Products you delete will appear here for reference.'
                : activeProducts.length === 0
                  ? 'Add your first product to start tracking stock, pricing, and margins.'
                  : stockFilter !== 'all'
                    ? `No ${STOCK_META[stockFilter].label.toLowerCase()} products right now.`
                    : 'Try a different search term or category.'
            }
            action={
              productView === 'active' && activeProducts.length === 0 && canEdit ? (
                <Button size="sm" onClick={openAdd} leftIcon={<PlusIcon className="h-3.5 w-3.5" />}>
                  Add product
                </Button>
              ) : productView === 'active' && (stockFilter !== 'all' || selectedCategory || search) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setStockFilter('all'); setSelectedCategory(''); setSearch('') }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Desktop table (md+) */}
      {!loading && displayed.length > 0 && (
        <div className="surface-card hidden overflow-hidden md:block">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="text-section-title text-slate-900">Inventory</h2>
              <p className="mt-0.5 text-xs text-neutral-light">
                {productView === 'active' ? 'Stock levels update as sales and restocks are recorded.' : 'Deleted products remain for historical reference.'}
              </p>
            </div>
            <Badge color={productView === 'deleted' ? 'rose' : 'slate'}>
              {displayed.length} item{displayed.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  {canEdit && productView === 'active' && (
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={displayed.length > 0 && displayed.every((p) => selected.has(p.product_id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                        aria-label="Select all products"
                      />
                    </th>
                  )}
                  <th
                    className="cursor-pointer select-none hover:text-slate-900"
                    onClick={() => handleSort('name')}
                  >
                    Product {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="cursor-pointer select-none hover:text-slate-900"
                    onClick={() => handleSort('quantity')}
                  >
                    On hand {sortKey === 'quantity' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th>Status</th>
                  <th
                    className="cursor-pointer select-none text-right hover:text-slate-900"
                    onClick={() => handleSort('cost_price')}
                  >
                    Unit cost {sortKey === 'cost_price' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="cursor-pointer select-none text-right hover:text-slate-900"
                    onClick={() => handleSort('price')}
                  >
                    Price {sortKey === 'price' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="cursor-pointer select-none text-right hover:text-slate-900"
                    onClick={() => handleSort('margin')}
                  >
                    Margin {sortKey === 'margin' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="cursor-pointer select-none text-right hover:text-slate-900"
                    onClick={() => handleSort('value')}
                  >
                    Stock value {sortKey === 'value' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((product) => {
                  const status = inventoryStatus(product)
                  const meta = STOCK_META[status]
                  const margin = marginPercent(product)
                  const threshold = lowStockThreshold(product)
                  const quantity = productQuantity(product)
                  return (
                    <tr
                      key={product.product_id}
                      className={`cursor-pointer ${selected.has(product.product_id) ? 'bg-primary-light/60' : ''}`}
                      onClick={() => setDetailProduct(product)}
                    >
                      {canEdit && productView === 'active' && (
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(product.product_id)}
                            onChange={() => toggleSelect(product.product_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                            aria-label={`Select ${product.name}`}
                          />
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${meta.avatar}`}>
                            {product.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">{product.name}</div>
                            <div className="mt-0.5 truncate text-xs text-neutral-light">
                              {product.sku ? <span className="font-mono">{product.sku}</span> : 'No SKU'}
                              {product.category ? <span> · {product.category}</span> : null}
                            </div>
                            {product.barcode ? (
                              <div className="mt-0.5 truncate font-mono text-[11px] text-neutral-light">
                                {product.barcode}
                              </div>
                            ) : null}
                            {isDeletedProduct(product) && (
                              <Badge color="rose" className="mt-1">
                                Deleted{product.deleted_at ? ` · ${formatDeletedAt(product.deleted_at)}` : ''}
                              </Badge>
                            )}
                            {!isDeletedProduct(product) && product.is_active === false && (
                              <Badge color="slate" className="mt-1">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-sm font-semibold ${meta.text}`}>{quantity}</span>
                          <span className="text-[11px] text-neutral-light">{product.unit}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${meta.bar}`}
                            style={{ width: `${stockLevelPercent(product)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-light">Reorder at {threshold}</div>
                      </td>
                      <td>
                        <Badge color={meta.color} dot>{meta.label}</Badge>
                      </td>
                      <td className="text-right text-slate-600">{formatCedi(product.cost_price)}</td>
                      <td className="text-right font-medium text-slate-900">{formatCedi(product.price)}</td>
                      <td className="text-right">
                        {margin == null ? (
                          <span className="text-neutral-light">—</span>
                        ) : (
                          <>
                            <div className={`font-medium ${margin < 0 ? 'text-danger' : 'text-slate-800'}`}>
                              {margin.toFixed(1)}%
                            </div>
                            <div className="text-[11px] text-neutral-light">
                              {formatCedi(Number(product.price) - Number(product.cost_price))} / unit
                            </div>
                          </>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="font-semibold text-slate-900">{formatCedi(stockValue(product))}</div>
                        <div className="text-[11px] text-neutral-light">at cost</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile cards (< md) */}
      {!loading && displayed.length > 0 && (
        <div className="space-y-3 md:hidden">
          {displayed.map((product) => {
            const status = inventoryStatus(product)
            const meta = STOCK_META[status]
            const margin = marginPercent(product)
            const threshold = lowStockThreshold(product)
            const quantity = productQuantity(product)
            return (
              <article
                key={product.product_id}
                className={`surface-card cursor-pointer p-4 transition-shadow hover:shadow-md ${
                  selected.has(product.product_id) ? 'ring-2 ring-primary/15' : ''
                }`}
                onClick={() => setDetailProduct(product)}
              >
                <div className="flex items-start gap-3">
                  {canEdit && productView === 'active' && (
                    <input
                      type="checkbox"
                      checked={selected.has(product.product_id)}
                      onChange={() => toggleSelect(product.product_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/30"
                      aria-label={`Select ${product.name}`}
                    />
                  )}
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${meta.avatar}`}>
                    {product.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-slate-900">{product.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-neutral-light">
                      {product.sku ? <span className="font-mono">{product.sku}</span> : 'No SKU'}
                      {product.category ? <span> · {product.category}</span> : null}
                    </p>
                    {product.barcode ? (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-light">{product.barcode}</p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {isDeletedProduct(product) ? (
                        <>
                          <Badge color="rose">Deleted</Badge>
                          {product.deleted_at && (
                            <span className="self-center text-[11px] text-neutral-light">
                              {formatDeletedAt(product.deleted_at)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge color={meta.color} dot>{meta.label}</Badge>
                          {product.is_active === false && <Badge color="slate">Inactive</Badge>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-light">On hand</p>
                    <p className={`mt-0.5 text-sm font-semibold ${meta.text}`}>
                      {quantity} <span className="text-[11px] font-normal text-neutral-light">{product.unit}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white">
                      <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${stockLevelPercent(product)}%` }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-light">Price</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatCedi(product.price)}</p>
                    <p className="text-[11px] text-neutral-light">Cost {formatCedi(product.cost_price)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-light">Value</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatCedi(stockValue(product))}</p>
                    <p className="text-[11px] text-neutral-light">at cost</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-neutral-light">
                    Reorder at {threshold}
                    {margin != null && <span> · {margin.toFixed(1)}% margin</span>}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDetailProduct(product) }}
                  >
                    View
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Barcode Scan Modal */}
      {showScan && (
        <BarcodeScanModal
          businessId={businessId}
          canCreate={canEdit}
          onClose={() => setShowScan(false)}
          onProduct={handleScannedProduct}
          onSuggestion={handleScanSuggestion}
          onCreate={handleScanCreate}
        />
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          canManage={canEdit}
          onEdit={(p) => {
            setDetailProduct(null)
            openEdit(p)
          }}
          onRestock={(p) => {
            setDetailProduct(null)
            openRestock(p)
          }}
          onToggleActive={(p) => {
            setDetailProduct(null)
            handleToggleActive(p)
          }}
          onDelete={(p) => {
            setDetailProduct(null)
            setDeleteConfirm({ open: true, product: p })
          }}
        />
      )}

      {/* Product Upload/Import Modal */}
      {showUpload && (
        <ProductUploadModal
          businessId={businessId}
          onClose={() => setShowUpload(false)}
          onUploaded={(message) => {
            setShowUpload(false)
            setUploadNotice(message)
            load()
          }}
        />
      )}

      {/* Restock Modal */}
      {showRestockModal && restockProduct && (
        <Modal onClose={() => setShowRestockModal(false)} panelClassName="w-full max-w-sm p-6 space-y-4">
          <div>
              <h3 className="font-semibold text-slate-900">Restock Product</h3>
              <p className="text-sm text-neutral-light mt-1">
                Add stock to <span className="font-medium text-slate-900">{restockProduct.name}</span>.
                Current quantity:{' '}
                <span className="font-medium text-slate-900">{restockProduct.quantity || 0}</span>
              </p>
            </div>
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label htmlFor="restock-qty" className="block text-sm font-medium text-slate-700 mb-1">
                  Quantity to add
                </label>
                <input
                  id="restock-qty"
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  Add Stock
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h3 className="font-semibold text-slate-900">{editProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveProduct} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Selling Price *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cost Price *</label>
                  <input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value="units">Units</option>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="l">Liters</option>
                    <option value="ml">Milliliters</option>
                    <option value="pcs">Pieces</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Low Stock Threshold</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beverages" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">SKU</label>
                  <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label htmlFor="product-barcode" className="block text-xs font-medium text-slate-700 mb-1">Barcode</label>
                  <input
                    id="product-barcode"
                    value={form.barcode}
                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Scan or type"
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
                  {editProduct ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm.open && (
        <Modal onClose={() => setDeleteConfirm({ open: false, product: null })} panelClassName="w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-danger-light flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Delete Product</h3>
            <p className="text-sm text-neutral-light mb-5">Are you sure you want to delete <strong>{deleteConfirm.product?.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm({ open: false, product: null })} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
            </div>
        </Modal>
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteConfirm && (
        <Modal onClose={() => setBulkDeleteConfirm(false)} panelClassName="w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-danger-light flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Delete Products</h3>
            <p className="text-sm text-neutral-light mb-5">
              Are you sure you want to delete <strong>{selected.size}</strong> selected product{selected.size > 1 ? 's' : ''}? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
                Delete {selected.size}
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}
