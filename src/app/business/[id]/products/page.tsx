'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { productAPI } from '@/lib/api'
import { extractArray, normalizeProduct, parseApiError, isStaffRole } from '@/lib/utils'

interface Product {
  product_id: number
  name: string
  price: number
  cost_price: number
  quantity: number
  unit: string
  [key: string]: any
}

function getStockBadge(qty: number, threshold: number = 10) {
  if (qty <= 0) return { bg: 'bg-danger-light', text: 'text-danger', label: 'Out of stock' }
  if (qty <= threshold * 0.3) return { bg: 'bg-danger-light', text: 'text-danger', label: `${qty} left` }
  if (qty <= threshold) return { bg: 'bg-warning-light', text: 'text-warning', label: `${qty} left` }
  return { bg: 'bg-success-light', text: 'text-success', label: `${qty} in stock` }
}

export default function ProductsPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', cost_price: '', quantity: '', unit: 'units' })
  const [creating, setCreating] = useState(false)
  const [restocking, setRestocking] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState<Record<number, string>>({})
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const isStaff = isStaffRole(user?.role)

  const loadProducts = async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const res = await productAPI.list(businessId)
      setProducts(extractArray(res.data).map(normalizeProduct))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessId) loadProducts()
  }, [businessId])

  if (isNaN(businessId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid business</h2>
        <p className="text-sm text-gray-500">This business doesn&apos;t exist or the URL is invalid.</p>
      </div>
    )
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !form.name.trim()) return
    setCreating(true)
    setError('')
    setSuccess('')
    try {
      await productAPI.create(businessId, {
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        quantity: parseInt(form.quantity) || 0,
        unit: form.unit.trim() || 'units',
      })
      setForm({ name: '', price: '', cost_price: '', quantity: '', unit: 'units' })
      setShowForm(false)
      setSuccess('Product added successfully!')
      loadProducts()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '))
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Failed to create product')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!businessId) return
    try {
      await productAPI.delete(businessId, id)
      setDeleteConfirm(null)
      loadProducts()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete product')
    }
  }

  const handleRestock = async (productId: number) => {
    if (!businessId) return
    const qty = parseInt(restockQty[productId] || '0')
    if (qty <= 0) return
    setRestocking(productId)
    try {
      await productAPI.update(businessId, productId, {
        quantity: (products.find((p) => p.product_id === productId)?.quantity || 0) + qty,
      })
      setRestockQty((prev) => ({ ...prev, [productId]: '' }))
      setRestocking(null)
      setSuccess('Product restocked!')
      loadProducts()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to restock')
      setRestocking(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-neutral-light mt-1">Manage your inventory</p>
        </div>
        {!isStaff && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        )}
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
          <h3 className="font-semibold text-gray-900 mb-4">Add New Product</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rice Bag"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Selling Price (GH₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost Price (GH₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. bags, pcs, kg"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {creating ? 'Adding...' : 'Add Product'}
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

      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
          />
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-right px-5 py-3 font-medium">Price</th>
                  <th className="text-right px-5 py-3 font-medium hidden sm:table-cell">Cost</th>
                  <th className="text-center px-5 py-3 font-medium">Stock</th>
                  <th className="text-center px-5 py-3 font-medium hidden sm:table-cell">Unit</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const threshold = product.threshold ?? product.reorder_level ?? 10
                  const badge = getStockBadge(product.quantity, threshold)
                  return (
                    <tr key={product.product_id} className="border-t border-gray-50 table-row-hover">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{product.name}</td>
                      <td className="px-5 py-3.5 text-right text-gray-900">GH₵{(product.price ?? 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right text-gray-600 hidden sm:table-cell">GH₵{(product.cost_price ?? 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-neutral-light hidden sm:table-cell">{product.unit || '-'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={restockQty[product.product_id] || ''}
                              onChange={(e) => setRestockQty((prev) => ({ ...prev, [product.product_id]: e.target.value }))}
                              placeholder="Qty"
                              className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:border-primary outline-none"
                            />
                            <button
                              onClick={() => handleRestock(product.product_id)}
                              disabled={restocking === product.product_id || !restockQty[product.product_id]}
                              className="px-2 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40"
                              title="Restock"
                            >
                              {restocking === product.product_id ? '...' : '+'}
                            </button>
                          </div>
                          {!isStaff && (
                            <>
                              {deleteConfirm === product.product_id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(product.product_id)}
                                    className="px-2 py-1 text-xs font-medium text-white bg-danger rounded-lg"
                                  >
                                    Del
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(product.product_id)}
                                  className="text-xs text-danger hover:underline font-medium"
                                >
                                  Del
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {search ? 'No products match your search' : 'No products yet'}
            </p>
            <p className="text-xs text-neutral-light mb-3">
              {search ? 'Try a different search term' : 'Add your first product to get started'}
            </p>
            {!search && !isStaff && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-dark transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
