'use client'

import { useEffect } from 'react'

interface Product {
  product_id: number
  name: string
  price: number
  cost_price: number
  quantity: number
  unit: string
  low_stock_threshold?: number
  category?: string
  description?: string
  sku?: string
  created_at?: string
  updated_at?: string
}

interface Props {
  product: Product
  onClose: () => void
}

export default function ProductDetailModal({ product, onClose }: Props) {
  const margin = product.price > 0 && product.cost_price > 0
    ? ((product.price - product.cost_price) / product.price * 100).toFixed(1)
    : null
  const isLowStock = product.quantity <= (product.low_stock_threshold ?? 10)
  const isOutOfStock = product.quantity === 0

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900">Product Details</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Product icon + name + status */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-gray-900 truncate">{product.name}</p>
              {product.sku && (
                <p className="text-xs text-neutral-light font-mono">SKU: {product.sku}</p>
              )}
            </div>
            {isOutOfStock ? (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-danger-light text-danger shrink-0">Out of Stock</span>
            ) : isLowStock ? (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-warning-light text-warning shrink-0">Low Stock</span>
            ) : (
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-success-light text-success shrink-0">In Stock</span>
            )}
          </div>

          {/* Price + Cost + Margin */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surfaceAlt rounded-xl p-3">
              <p className="text-xs text-neutral-light mb-1">Selling Price</p>
              <p className="text-sm font-bold text-gray-900">GH₵{product.price.toFixed(2)}</p>
            </div>
            <div className="bg-surfaceAlt rounded-xl p-3">
              <p className="text-xs text-neutral-light mb-1">Cost Price</p>
              <p className="text-sm font-bold text-gray-900">GH₵{product.cost_price.toFixed(2)}</p>
            </div>
            <div className="bg-surfaceAlt rounded-xl p-3">
              <p className="text-xs text-neutral-light mb-1">Margin</p>
              <p className="text-sm font-bold text-gray-900">{margin !== null ? `${margin}%` : '—'}</p>
            </div>
          </div>

          {/* Stock + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-1">Stock Quantity</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900">{product.quantity}</span>
                <span className="text-xs text-neutral-light">{product.unit}</span>
              </div>
              {isLowStock && !isOutOfStock && (
                <p className="text-xs text-warning mt-1">
                  Below threshold ({product.low_stock_threshold ?? 10})
                </p>
              )}
            </div>
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-1">Category</p>
              <p className="text-sm font-medium text-gray-900">{product.category || 'Uncategorized'}</p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-surfaceAlt rounded-xl p-4 space-y-2">
            {product.created_at && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="text-gray-700">Added {new Date(product.created_at).toLocaleDateString()}</span>
              </div>
            )}
            {product.updated_at && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                <span className="text-gray-700">Updated {new Date(product.updated_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Close button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
