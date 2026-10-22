'use client'

import { useState } from 'react'
import { productAPI } from '@/lib/api'
import { extractArray, normalizeProduct, parseApiError } from '@/lib/utils'
import type { Product } from '@/lib/types'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'

interface Props {
  businessId: number
  initialName?: string
  onClose: () => void
  onCreated: (product: Product) => void
}

function makeForm(name = '') {
  return {
    name,
    price: '',
    cost_price: '',
    quantity: '',
    unit: 'units',
    low_stock_threshold: '10',
    category: '',
    sku: '',
    description: '',
  }
}

/**
 * Inline product creation for the sale form.
 *
 * A cashier should not have to abandon an in-progress sale, navigate to
 * Products, create the item, come back and start over. This captures the
 * minimum needed to sell the item, saves it to the inventory, and hands the
 * created product back so the sale line can select it immediately.
 */
export default function QuickAddProductModal({ businessId, initialName = '', onClose, onCreated }: Props) {
  const [form, setForm] = useState(() => makeForm(initialName))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (field: keyof ReturnType<typeof makeForm>, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    const name = form.name.trim()
    if (!name) {
      setError('Product name is required')
      return
    }

    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) {
      setError('Enter a valid selling price')
      return
    }

    const quantity = parseInt(form.quantity, 10)
    if (isNaN(quantity) || quantity < 0) {
      setError('Enter a valid quantity')
      return
    }

    const costPrice = form.cost_price.trim() ? parseFloat(form.cost_price) : 0
    if (isNaN(costPrice) || costPrice < 0) {
      setError('Enter a valid cost price')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name,
      price,
      cost_price: costPrice,
      quantity,
      unit: form.unit || 'units',
      low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 10,
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      sku: form.sku.trim() || undefined,
    }

    try {
      const res = await productAPI.create(businessId, payload)
      const raw = res.data?.data ?? res.data
      const candidate = raw?.product ?? raw
      let created: Product | null =
        candidate && (candidate.product_id ?? candidate.id) != null
          ? normalizeProduct({ ...payload, ...candidate })
          : null

      // Some deployments only return a success message. Fall back to the
      // refreshed catalogue so the new line item can still be selected.
      if (!created) {
        const listRes = await productAPI.list(businessId)
        created =
          extractArray(listRes.data)
            .map(normalizeProduct)
            .find((p) => (p.name || '').trim().toLowerCase() === name.toLowerCase()) || null
      }

      if (!created) {
        throw new Error('Product was saved but could not be loaded. Please refresh and try again.')
      }

      onCreated(created)
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'
  const labelClass = 'mb-1 block text-xs font-medium text-slate-700'

  return (
    <Modal
      onClose={onClose}
      closeOnOverlay={!saving}
      panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto"
      aria-labelledby="quick-add-product-title"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h3 id="quick-add-product-title" className="font-semibold text-slate-900">
            Add Product
          </h3>
          <p className="mt-0.5 text-xs text-neutral-light">
            It will be saved to your inventory and selected for this sale.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close add product"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
        {error && <Alert kind="error">{error}</Alert>}

        <div>
          <label htmlFor="quick-product-name" className={labelClass}>
            Name *
          </label>
          <input
            id="quick-product-name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            autoFocus
            placeholder="e.g. Rice 50kg"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quick-product-price" className={labelClass}>
              Selling Price (GH₵) *
            </label>
            <input
              id="quick-product-price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              required
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="quick-product-cost" className={labelClass}>
              Cost Price (GH₵)
            </label>
            <input
              id="quick-product-cost"
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={(e) => update('cost_price', e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quick-product-quantity" className={labelClass}>
              Quantity in Stock *
            </label>
            <input
              id="quick-product-quantity"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              required
              placeholder="e.g. 20"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="quick-product-unit" className={labelClass}>
              Unit
            </label>
            <select
              id="quick-product-unit"
              value={form.unit}
              onChange={(e) => update('unit', e.target.value)}
              className={inputClass}
            >
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
            <label htmlFor="quick-product-threshold" className={labelClass}>
              Low Stock Threshold
            </label>
            <input
              id="quick-product-threshold"
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={(e) => update('low_stock_threshold', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="quick-product-category" className={labelClass}>
              Category
            </label>
            <input
              id="quick-product-category"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              placeholder="e.g. Beverages"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="quick-product-sku" className={labelClass}>
            SKU
          </label>
          <input
            id="quick-product-sku"
            value={form.sku}
            onChange={(e) => update('sku', e.target.value)}
            placeholder="Optional product code"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="quick-product-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="quick-product-description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={2}
            placeholder="Optional notes about this product"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Add & Select'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
