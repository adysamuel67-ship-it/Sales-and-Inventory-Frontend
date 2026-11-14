'use client'

import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { formatCedi, formatDeletedAt, isDeletedProduct } from '@/lib/utils'
import {
  inventoryStatus,
  lowStockThreshold,
  marginPercent,
  productQuantity,
  stockLevelPercent,
  stockValue,
  type InventoryStatus,
} from '@/lib/products'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  onClose: () => void
  canManage?: boolean
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
  onRestock?: (product: Product) => void
  onToggleActive?: (product: Product) => void
}

const STATUS_META: Record<
  InventoryStatus,
  { label: string; color: 'emerald' | 'amber' | 'red'; bar: string; plate: string }
> = {
  in_stock: {
    label: 'In stock',
    color: 'emerald',
    bar: 'bg-emerald-500',
    plate: 'bg-emerald-50 text-emerald-700',
  },
  low_stock: {
    label: 'Low stock',
    color: 'amber',
    bar: 'bg-amber-500',
    plate: 'bg-amber-50 text-amber-700',
  },
  out_of_stock: {
    label: 'Out of stock',
    color: 'red',
    bar: 'bg-rose-500',
    plate: 'bg-rose-50 text-rose-700',
  },
}

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ProductDetailModal({
  product,
  onClose,
  canManage,
  onEdit,
  onDelete,
  onRestock,
  onToggleActive,
}: Props) {
  const status = inventoryStatus(product)
  const meta = STATUS_META[status]
  const margin = marginPercent(product)
  const quantity = productQuantity(product)
  const threshold = lowStockThreshold(product)
  const deleted = isDeletedProduct(product)

  return (
    <Modal onClose={onClose} panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h3 className="font-semibold text-slate-900">Product details</h3>
          <p className="mt-0.5 text-xs text-neutral-light">Inventory, pricing, and product information</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close product details"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="flex items-start gap-4">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ${meta.plate}`}>
            {product.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-slate-900">{product.name}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-light">
              {product.sku ? <span className="font-mono">{product.sku}</span> : 'No SKU'}
              {product.category ? <span> · {product.category}</span> : null}
            </p>
            {product.barcode ? (
              <p className="mt-0.5 truncate font-mono text-[11px] text-neutral-light">{product.barcode}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge color={meta.color} dot>{meta.label}</Badge>
              {product.is_active === false && !deleted && <Badge color="slate">Inactive</Badge>}
              {deleted && (
                <Badge color="rose">
                  Deleted{product.deleted_at ? ` · ${formatDeletedAt(product.deleted_at)}` : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-micro uppercase tracking-[0.08em] text-neutral-light">On hand</p>
              <p className={`mt-1 text-2xl font-bold ${status === 'out_of_stock' ? 'text-rose-700' : status === 'low_stock' ? 'text-amber-700' : 'text-slate-900'}`}>
                {quantity}{' '}
                <span className="text-sm font-medium text-neutral-light">{product.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-micro uppercase tracking-[0.08em] text-neutral-light">Reorder point</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{threshold}</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${stockLevelPercent(product)}%` }} />
          </div>
          {status === 'low_stock' && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              At or below the reorder point. Restock soon to avoid a stock-out.
            </p>
          )}
          {status === 'out_of_stock' && (
            <p className="mt-2 text-xs font-medium text-rose-700">
              This product is unavailable for sale until it is restocked.
            </p>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-light">Selling price</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{formatCedi(product.price)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-light">Unit cost</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{formatCedi(product.cost_price)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-light">Margin</p>
            <p className={`mt-1 text-base font-semibold ${margin != null && margin < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {margin == null ? '—' : `${margin.toFixed(1)}%`}
            </p>
            {margin != null && (
              <p className="mt-0.5 text-[11px] text-neutral-light">
                {formatCedi(Number(product.price) - Number(product.cost_price))} profit / unit
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-neutral-light">Stock value</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{formatCedi(stockValue(product))}</p>
            <p className="mt-0.5 text-[11px] text-neutral-light">
              {formatCedi(stockValue(product, 'retail'))} at retail
            </p>
          </div>
        </div>

        {product.barcode && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-neutral-light">Barcode</p>
            <p className="truncate font-mono text-sm font-medium text-slate-900">{product.barcode}</p>
          </div>
        )}

        {product.description && (
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-light">Description</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{product.description}</p>
          </div>
        )}

        {(product.created_at || product.updated_at) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-xs text-neutral-light">
            {product.created_at && (
              <p>
                Added <span className="font-medium text-slate-700">{formatDate(product.created_at)}</span>
              </p>
            )}
            {product.updated_at && (
              <p>
                Updated <span className="font-medium text-slate-700">{formatDate(product.updated_at)}</span>
              </p>
            )}
          </div>
        )}

        {canManage && deleted && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-neutral-light">
            This product is deleted. Its stock and sales history are kept for records, but it can no longer be sold or restocked.
          </p>
        )}

        {canManage && !deleted && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onEdit?.(product)}
              className="rounded-xl bg-primary-light py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Edit Product
            </button>
            <button
              onClick={() => onRestock?.(product)}
              className="rounded-xl bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              Restock
            </button>
            <button
              onClick={() => onToggleActive?.(product)}
              className={`rounded-xl py-2.5 text-sm font-medium transition-colors ${
                product.is_active === false
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {product.is_active === false ? 'Activate' : 'Deactivate'}
            </button>
            <button
              onClick={() => onDelete?.(product)}
              className="rounded-xl bg-rose-50 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
            >
              Delete Product
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 rounded-b-2xl border-t border-slate-200 bg-white px-6 py-4">
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
