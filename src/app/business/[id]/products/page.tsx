'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { productAPI } from '@/lib/api'
import { normalizeProduct, extractArray, parseApiError, isAdminRole } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import ProductDetailModal from '@/components/ProductDetailModal'

export default function ProductsPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; product: any }>({ open: false, product: null })
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [detailProduct, setDetailProduct] = useState<any>(null)
  const [form, setForm] = useState({
    name: '', price: '', cost_price: '', quantity: '', unit: 'units', low_stock_threshold: '10', category: '', description: '', sku: '',
  })
  const [saving, setSaving] = useState(false)

  const invalidBusiness = isNaN(businessId)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productAPI.list(businessId!)
      const items = extractArray(res.data).map(normalizeProduct)
      setAllProducts(items)
      const cats = [...new Set(items.map((p: any) => p.category).filter(Boolean))] as string[]
      setCategories(cats)
      setError('')
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { if (businessId) load() }, [businessId, load])

  const displayed = useMemo(() => {
    let items = [...allProducts]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      )
    }
    if (selectedCategory) items = items.filter(p => p.category === selectedCategory)
    if (lowStockOnly) items = items.filter(p => p.quantity <= (p.low_stock_threshold ?? 10))
    items.sort((a: any, b: any) => {
      let va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va == null) return 1
      if (vb == null) return -1
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return items
  }, [allProducts, search, sortKey, sortAsc, selectedCategory, lowStockOnly])

  const stats = useMemo(() => ({
    total: allProducts.length,
    lowStock: allProducts.filter(p => p.quantity <= (p.low_stock_threshold ?? 10)).length,
    outOfStock: allProducts.filter(p => p.quantity === 0).length,
    totalValue: allProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0),
  }), [allProducts])

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  const openAdd = () => {
    setForm({ name: '', price: '', cost_price: '', quantity: '', unit: 'units', low_stock_threshold: '10', category: '', description: '', sku: '' })
    setEditProduct(null)
    setShowAdd(true)
  }

  const openEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setForm({
      name: p.name || '', price: String(p.price ?? ''), cost_price: String(p.cost_price ?? ''),
      quantity: String(p.quantity ?? ''), unit: p.unit || 'units',
      low_stock_threshold: String(p.low_stock_threshold ?? 10), category: p.category || '',
      description: p.description || '', sku: p.sku || '',
    })
    setEditProduct(p)
    setShowAdd(true)
  }

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
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
      }
      if (editProduct) {
        await productAPI.update(businessId!, editProduct.product_id, payload)
      } else {
        await productAPI.create(businessId!, payload)
      }
      setShowAdd(false)
      load()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm.product) return
    try {
      await productAPI.delete(businessId!, deleteConfirm.product.product_id)
      setDeleteConfirm({ open: false, product: null })
      load()
    } catch (err: any) {
      setError(parseApiError(err))
    }
  }

  const canEdit = isAdminRole(user?.business_role || user?.role)

  if (invalidBusiness) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid business</h2>
        <p className="text-sm text-gray-500">This business doesn&apos;t exist or the URL is invalid.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-neutral-light mt-0.5">{stats.total} products · {stats.lowStock} low stock · {stats.outOfStock} out of stock</p>
        </div>
        {canEdit && (
          <button onClick={openAdd} className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
            + Add Product
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: stats.total, color: 'text-gray-900' },
          { label: 'Low Stock', value: stats.lowStock, color: stats.lowStock > 0 ? 'text-warning' : 'text-gray-900' },
          { label: 'Out of Stock', value: stats.outOfStock, color: stats.outOfStock > 0 ? 'text-danger' : 'text-gray-900' },
          { label: 'Inventory Value', value: `GH₵${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-primary' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <p className="text-xs text-neutral-light">{s.label}</p>
            <p className={`text-lg sm:text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${lowStockOnly ? 'bg-warning-light border-warning text-warning' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Low Stock
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-4 text-sm text-danger">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && displayed.length === 0 && (
        <div className="text-center py-16 text-neutral-light">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <p className="text-sm font-medium">No products found</p>
        </div>
      )}

      {/* Desktop table (md+) */}
      {!loading && displayed.length > 0 && (
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-neutral-light uppercase tracking-wider">
                {[
                  { key: 'name', label: 'Product' },
                  { key: 'price', label: 'Price' },
                  { key: 'cost_price', label: 'Cost' },
                  { key: 'quantity', label: 'Stock' },
                  { key: 'category', label: 'Category' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 cursor-pointer hover:text-gray-900 transition-colors select-none"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => {
                const isLow = p.quantity <= (p.low_stock_threshold ?? 10)
                const isOut = p.quantity === 0
                return (
                  <tr
                    key={p.product_id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => setDetailProduct(p)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.sku && <div className="text-xs text-neutral-light font-mono mt-0.5">SKU: {p.sku}</div>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">GH₵{Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">GH₵{Number(p.cost_price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-gray-900'}`}>
                        {p.quantity}
                      </span>
                      <span className="text-neutral-light ml-1 text-xs">{p.unit}</span>
                      {isLow && !isOut && <span className="ml-1.5 text-xs text-warning">⚠</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => openEdit(p, e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, product: p }) }} className="p-1.5 rounded-lg hover:bg-danger-light text-gray-500 hover:text-danger transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards (< md) */}
      {!loading && displayed.length > 0 && (
        <div className="md:hidden space-y-3">
          {displayed.map(p => {
            const isLow = p.quantity <= (p.low_stock_threshold ?? 10)
            const isOut = p.quantity === 0
            return (
              <div
                key={p.product_id}
                className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => setDetailProduct(p)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{p.name}</h3>
                    {p.sku && <p className="text-xs text-neutral-light font-mono mt-0.5">SKU: {p.sku}</p>}
                  </div>
                  {isOut ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger shrink-0">Out</span>
                  ) : isLow ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning shrink-0">Low</span>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-neutral-light">Price</p>
                    <p className="font-medium text-gray-900">GH₵{Number(p.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-light">Stock</p>
                    <p className={`font-medium ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-gray-900'}`}>
                      {p.quantity} <span className="text-xs font-normal text-neutral-light">{p.unit}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-light">Category</p>
                    <p className="font-medium text-gray-900">{p.category || '—'}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button onClick={(e) => openEdit(p, e)} className="flex-1 py-2 text-xs font-medium text-primary bg-primary-light rounded-lg hover:bg-primary/15 transition-colors">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, product: p }) }} className="flex-1 py-2 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/15 transition-colors">Delete</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-900">{editProduct ? 'Edit Product' : 'Add Product'}</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveProduct} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Selling Price *</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cost Price *</label>
                  <input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Beverages" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : editProduct ? 'Update' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm({ open: false, product: null })}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-full bg-danger-light flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Delete Product</h3>
            <p className="text-sm text-neutral-light mb-5">Are you sure you want to delete <strong>{deleteConfirm.product?.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm({ open: false, product: null })} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
