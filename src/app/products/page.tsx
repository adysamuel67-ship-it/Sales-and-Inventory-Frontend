'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import ProductDetailModal from '@/components/ProductDetailModal'
import { useAuth } from '@/lib/auth'
import { productAPI } from '@/lib/api'
import { useBusinessId } from '@/lib/useBusinessId'
import { extractArray, normalizeProduct } from '@/lib/utils'

interface Product {
  product_id: number
  name: string
  price: number
  cost_price: number
  quantity: number
  unit: string
  [key: string]: any
}

export default function ProductsPage() {
  const { isAuthenticated, isLoading, profileLoaded, isVerified, user } = useAuth()
  const router = useRouter()
  const { businessId, loading: bizLoading } = useBusinessId()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', cost_price: '', quantity: '', unit: 'units' })
  const [creating, setCreating] = useState(false)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [search, setSearch] = useState('')

  const filteredProducts = products.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.unit?.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login')
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (profileLoaded && isAuthenticated && user && user.is_verified === false) {
      router.replace('/verify')
    }
  }, [profileLoaded, isAuthenticated, user?.is_verified, router])

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
    if (!businessId || !confirm('Are you sure you want to delete this product?')) return
    try {
      await productAPI.delete(businessId, id)
      loadProducts()
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Failed to delete product')
    }
  }

  if (isLoading || !isAuthenticated || !profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!businessId && !bizLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No business selected</h2>
          <p className="text-sm text-neutral-light mb-4">Create or join a business to manage your products</p>
          <Link
            href="/businesses"
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Go to Businesses
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-neutral-light mt-1">Manage your inventory</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl">{success}</div>
      )}

      {products.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Product</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Rice Bag"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (GH₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (GH₵)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. bags, pcs, kg"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {creating ? 'Adding...' : 'Add Product'}
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

      {loading || bizLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.quantity <= 0
            const isLowStock = product.quantity > 0 && product.quantity <= (product.low_stock_threshold ?? 10)
            const margin = product.price > 0 && product.cost_price > 0
              ? ((product.price - product.cost_price) / product.price * 100)
              : null
            return (
              <button
                key={product.product_id}
                onClick={() => setDetailProduct(product)}
                className="bg-surface rounded-2xl border border-gray-100 p-5 text-left hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  {isOutOfStock ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-danger-light text-danger">Out of stock</span>
                  ) : isLowStock ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-warning-light text-warning">Low stock</span>
                  ) : null}
                </div>

                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate group-hover:text-primary transition-colors">{product.name}</h3>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-lg font-bold text-gray-900">GH₵{(product.price ?? 0).toFixed(2)}</span>
                  <span className="text-[11px] text-neutral-light">/ {product.unit || 'unit'}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-light">
                      Cost: <span className="text-gray-700 font-medium">GH₵{(product.cost_price ?? 0).toFixed(2)}</span>
                    </span>
                    {margin !== null && (
                      <span className="text-success font-medium">
                        {margin.toFixed(0)}% margin
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className={`text-xs font-medium ${isOutOfStock ? 'text-danger' : isLowStock ? 'text-warning' : 'text-success'}`}>
                    {product.quantity ?? 0} {product.unit || 'units'} in stock
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-primary/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">No products yet</p>
          <p className="text-xs text-neutral-light mb-4">Add your first product to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Add Product
          </button>
        </div>
      )}
      {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />}
    </DashboardLayout>
  )
}
