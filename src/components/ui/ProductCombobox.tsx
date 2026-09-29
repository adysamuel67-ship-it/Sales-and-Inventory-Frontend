'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCedi } from '@/lib/utils'

export interface ProductOption {
  product_id: number
  name: string
  price: number
  quantity: number
  sku?: string
  category?: string
  low_stock_threshold?: number
  is_active?: boolean
}

interface Props {
  products: ProductOption[]
  /** Selected product id as a string, or '' when nothing is chosen. */
  value: string
  onChange: (productId: string) => void
  /** Product ids already used by other line items - hidden to prevent duplicates. */
  excludeIds?: (string | number)[]
  placeholder?: string
  autoFocus?: boolean
  className?: string
  id?: string
}

const MAX_RESULTS = 50

/**
 * Searchable product picker.
 *
 * A native <select> forces the user to scroll a flat list of <option>s with no
 * filtering, which falls apart as soon as a shop has more than a few dozen
 * products. This is a real combobox: type to filter by name / SKU / category,
 * arrow keys to move, Enter to pick, Escape to dismiss.
 *
 * Follows the WAI-ARIA combobox pattern (1.2) so screen readers announce the
 * active option as the user types.
 */
export default function ProductCombobox({
  products,
  value,
  onChange,
  excludeIds = [],
  placeholder = 'Search products by name, SKU or category',
  autoFocus = false,
  className = '',
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = useMemo(
    () => products.find((p) => String(p.product_id) === String(value)) || null,
    [products, value]
  )

  const excluded = useMemo(() => new Set(excludeIds.map(String)), [excludeIds])

  // In-stock products first, then alphabetical. A cashier should never have to
  // scroll past sold-out items to find something they can actually sell.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = products.filter(
      (p) =>
        p.is_active !== false &&
        (!excluded.has(String(p.product_id)) || String(p.product_id) === String(value))
    )

    const filtered = q
      ? pool.filter((p) =>
          [p.name, p.sku, p.category].some((field) => (field || '').toLowerCase().includes(q))
        )
      : pool

    return [...filtered]
      .sort((a, b) => {
        const aIn = (a.quantity ?? 0) > 0
        const bIn = (b.quantity ?? 0) > 0
        if (aIn !== bIn) return aIn ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .slice(0, MAX_RESULTS)
  }, [products, query, excluded, value])

  // Reset the highlight whenever the result set changes underneath it.
  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  // Close on outside click, the standard dismiss behaviour.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Keep the highlighted option in view during keyboard navigation.
  // Guarded because jsdom does not implement scrollIntoView.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, open])

  const commit = (productId: string) => {
    onChange(productId)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1
        return Math.max(0, Math.min(results.length - 1, next))
      })
      return
    }
    if (e.key === 'Enter') {
      if (open && results[activeIndex]) {
        // preventDefault stops the enclosing <form> submitting on Enter.
        e.preventDefault()
        commit(String(results[activeIndex].product_id))
      }
      return
    }
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  // While closed with a selection, show the product name; otherwise show the query.
  const displayValue = open ? query : selected ? selected.name : ''

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <ProductComboboxInput
        inputRef={inputRef}
        id={id}
        open={open}
        displayValue={displayValue}
        placeholder={selected ? '' : placeholder}
        autoFocus={autoFocus}
        showPrice={!!selected && !open}
        price={selected ? formatCedi(selected.price ?? 0) : ''}
        onFocus={() => setOpen(true)}
        onChange={(v) => {
          setQuery(v)
          setOpen(true)
          // Typing after a selection means "pick something else", so clear it.
          if (value) onChange('')
          if (value) onChange('')
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ProductComboboxList
          listRef={listRef}
          listboxId={`${id || 'product'}-listbox`}
          query={query}
          hasAnyProducts={products.length > 0}
          results={results}
          activeIndex={activeIndex}
          selectedId={String(value)}
          onHover={setActiveIndex}
          onSelect={commit}
        />
      )}
    </div>
  )
}

/** The text field plus its leading search icon and trailing price pill. */
function ProductComboboxInput({
  inputRef,
  id,
  open,
  displayValue,
  placeholder,
  autoFocus,
  showPrice,
  price,
  onFocus,
  onChange,
  onKeyDown,
}: {
  inputRef: React.RefObject<HTMLInputElement>
  id?: string
  open: boolean
  displayValue: string
  placeholder: string
  autoFocus: boolean
  showPrice: boolean
  price: string
  onFocus: () => void
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-light"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
      </svg>

      {showPrice && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
          aria-hidden="true"
        >
          {price}
        </span>
      )}

      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id || 'product'}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        value={displayValue}
        placeholder={placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={`h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 text-sm text-slate-900 shadow-xs transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ${
          showPrice ? 'pr-24' : 'pr-4'
        }`}
      />
    </div>
  )
}

/** The floating result list, including the no-match and empty states. */
function ProductComboboxList({
  listRef,
  listboxId,
  query,
  hasAnyProducts,
  results,
  activeIndex,
  selectedId,
  onHover,
  onSelect,
}: {
  listRef: React.RefObject<HTMLUListElement>
  listboxId: string
  query: string
  hasAnyProducts: boolean
  results: ProductOption[]
  activeIndex: number
  selectedId: string
  onHover: (i: number) => void
  onSelect: (productId: string) => void
}) {
  return (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label="Products"
      className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 animate-scale-in overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1.5 shadow-popover"
    >
      {results.length === 0 ? (
        <li className="px-3 py-6 text-center text-sm text-neutral-light">
          {!hasAnyProducts
            ? 'No products in your inventory yet.'
            : `No products match \u201C${query}\u201D.`}
        </li>
      ) : (
        results.map((p, i) => (
          <li key={p.product_id} role="none">
            <ProductOptionRow
              product={p}
              index={i}
              isActive={i === activeIndex}
              isSelected={String(p.product_id) === selectedId}
              onHover={onHover}
              onSelect={onSelect}
            />
          </li>
        ))
      )}
    </ul>
  )
}

/** A single result row: name + SKU/category left, price + stock right. */
function ProductOptionRow({
  product: p,
  index,
  isActive,
  isSelected,
  onHover,
  onSelect,
}: {
  product: ProductOption
  index: number
  isActive: boolean
  isSelected: boolean
  onHover: (i: number) => void
  onSelect: (productId: string) => void
}) {
  const out = (p.quantity ?? 0) <= 0
  const threshold = p.low_stock_threshold ?? 0
  const low = !out && threshold > 0 && (p.quantity ?? 0) <= threshold

  const stockTone = out
    ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
    : low
      ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'

  return (
    <button
      type="button"
      id={`product-opt-${p.product_id}`}
      role="option"
      aria-selected={isSelected}
      data-index={index}
      // Keep focus on the input so the combobox never loses its caret.
      onMouseEnter={() => onHover(index)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(String(p.product_id))}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 ${
        isActive ? 'bg-primary-light' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-light">
          {[p.sku ? `SKU ${p.sku}` : null, p.category].filter(Boolean).join(' · ') ||
            'No SKU or category'}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold text-slate-900">{formatCedi(p.price ?? 0)}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${stockTone}`}>
          {out ? 'Out of stock' : `${p.quantity} in stock`}
        </span>
      </div>
    </button>
  )
}
