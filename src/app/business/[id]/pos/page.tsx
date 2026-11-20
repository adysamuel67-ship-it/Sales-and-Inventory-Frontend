'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productAPI, saleAPI } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Product } from '@/lib/types'
import {
  addToCart,
  buildBarcodeIndex,
  cartTotals,
  isCartSellable,
  overStockItems,
  removeFromCart,
  toPosCartItem,
  updateCartQuantity,
  type PosCartItem,
} from '@/lib/pos'
import { cacheProducts, getCachedProducts } from '@/lib/posCache'
import { resolvePendingProducts } from '@/lib/pendingProducts'
import { dequeue, enqueue } from '@/lib/offlineDb'
import { requestBackgroundSync } from '@/lib/offlineSync'
import {
  extractArray,
  formatMoney,
  isDeletedProduct,
  isManagerRole,
  normalizeProduct,
  parseApiError,
} from '@/lib/utils'
import PosScanner from '@/components/pos/PosScanner'
import QuickAddProductModal from '@/components/QuickAddProductModal'
import SaleReceiptModal from '@/components/SaleReceiptModal'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import { ScanIcon, TrashIcon } from '@/components/ui/Icons'

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function playScanBeep() {
  if (typeof window === 'undefined') return
  const AudioCtor = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!AudioCtor) return

  try {
    const context = new AudioCtor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.08)
    oscillator.onended = () => {
      try {
        context.close()
      } catch {
        // Ignore browsers that have already released the context.
      }
    }
  } catch {
    // Audio is a confirmation, never a sale-blocking requirement.
  }
}

export default function PosPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const businessId = parseInt(params?.id as string)

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<PosCartItem[]>([])
  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [catalogueWarning, setCatalogueWarning] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [flash, setFlash] = useState<{ text: string; at: number } | null>(null)
  const [scanNotice, setScanNotice] = useState<{ barcode: string; canCreate: boolean } | null>(null)
  const [pendingQuickAdd, setPendingQuickAdd] = useState<{ barcode: string } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [submitting, setSubmitting] = useState(false)
  const [receiptSaleId, setReceiptSaleId] = useState<number | null>(null)

  const idempotencyKeyRef = useRef('')
  const indexRef = useRef<Map<string, Product>>(new Map())

  const role = user?.business_role || user?.role
  const canCreateProduct = isManagerRole(role)

  const barcodeIndex = useMemo(() => buildBarcodeIndex(products), [products])
  useEffect(() => {
    indexRef.current = barcodeIndex
  }, [barcodeIndex])

  const totals = useMemo(() => cartTotals(cart), [cart])
  const overStock = useMemo(() => overStockItems(cart), [cart])
  const sellable = isCartSellable(cart)

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(timer)
  }, [flash])

  const loadCatalogue = useCallback(async () => {
    if (!businessId || Number.isNaN(businessId)) return
    setCatalogueLoading(true)
    setCatalogueWarning('')
    setError('')

    try {
      const response = await productAPI.list(businessId)
      const list = extractArray(response.data)
        .map(normalizeProduct)
        .filter((product) => !isDeletedProduct(product) && product.is_active !== false)
      setProducts(list)
      void cacheProducts(businessId, list)
    } catch (err) {
      const cached = await getCachedProducts(businessId)
      if (cached.length > 0) {
        setProducts(cached)
        setCatalogueWarning('Could not refresh the catalogue. Using the products saved on this device.')
      } else {
        setError(parseApiError(err) || 'Could not load your products.')
      }
    } finally {
      setCatalogueLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    void loadCatalogue()
  }, [loadCatalogue])

  const changeCart = useCallback((update: (previous: PosCartItem[]) => PosCartItem[]) => {
    // A different cart is a different sale. Reusing an idempotency key from a
    // failed attempt could make the server return the earlier result.
    idempotencyKeyRef.current = ''
    setCart(update)
  }, [])

  const addProduct = useCallback(
    (product: Product) => {
      changeCart((previous) => addToCart(previous, product, 1))
      setScanNotice(null)
      setError('')
      setFlash({ text: `${product.name} added`, at: Date.now() })
      playScanBeep()
    },
    [changeCart]
  )

  const handleScan = useCallback(
    (code: string) => {
      const product = indexRef.current.get(code)
      if (!product) {
        setScanNotice({ barcode: code, canCreate: canCreateProduct })
        setFlash(null)
        return
      }
      addProduct(product)
    },
    [addProduct, canCreateProduct]
  )

  const handleQuickProductCreated = (created: Product) => {
    const product = normalizeProduct(created)
    setProducts((previous) => {
      const next = [...previous.filter((item) => item.product_id !== product.product_id), product]
      void cacheProducts(businessId, next)
      return next
    })
    setPendingQuickAdd(null)
    addProduct(product)
  }

  const handleQuickProductSaved = (pending: Product, saved: Product) => {
    const product = { ...normalizeProduct(saved), pending: false }
    setProducts((previous) => {
      const next = previous.map((item) => (item.product_id === pending.product_id ? product : item))
      void cacheProducts(businessId, next)
      return next
    })
    setCart((previous) =>
      previous.map((item) =>
        item.product_id === pending.product_id
          ? {
              ...item,
              product_id: product.product_id,
              name: product.name,
              price: Number(product.price || 0),
              stock: Number(product.quantity || 0),
              unit: product.unit || 'units',
              barcode: product.barcode,
              pending: false,
            }
          : item
      )
    )
  }

  const handleQuickProductFailed = (pending: Product, message: string) => {
    setProducts((previous) => {
      const next = previous.filter((item) => item.product_id !== pending.product_id)
      void cacheProducts(businessId, next)
      return next
    })
    setCart((previous) => removeFromCart(previous, pending.product_id))
    setFlash(null)
    setError(message || `Could not save "${pending.name}" to inventory`)
  }

  const increment = (item: PosCartItem) =>
    changeCart((previous) => updateCartQuantity(previous, item.product_id, item.quantity + 1))

  const decrement = (item: PosCartItem) =>
    changeCart((previous) => updateCartQuantity(previous, item.product_id, item.quantity - 1))

  const remove = (item: PosCartItem) =>
    changeCart((previous) => removeFromCart(previous, item.product_id))

  const clearSale = () => {
    if (cart.length === 0) return
    if (typeof window !== 'undefined' && !window.confirm('Clear every item from this sale?')) return
    changeCart(() => [])
    setPaymentMethod('cash')
    setScanNotice(null)
    setNotice('')
  }

  const choosePaymentMethod = (method: string) => {
    if (method !== paymentMethod) idempotencyKeyRef.current = ''
    setPaymentMethod(method)
  }

  const completeSale = async () => {
    if (!sellable || submitting) return
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const resolved = await resolvePendingProducts(cart.map((item) => item.product_id))
      const items = cart.map((item) => ({
        product_id: resolved.get(item.product_id)?.product_id ?? item.product_id,
        quantity: item.quantity,
      }))
      const total = totals.total
      const sold = items

      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = newIdempotencyKey()

      const payload = {
        list_items: items,
        amount_paid: total,
        payment_method: paymentMethod,
      }
      const op = await enqueue({
        type: 'sale.record',
        businessId,
        userId: user?.id,
        payload,
        idempotencyKey: idempotencyKeyRef.current,
      })

      const response = await saleAPI.record(businessId, payload, idempotencyKeyRef.current)
      await dequeue(op.id)

      const raw = response.data?.data ?? response.data
      const savedSaleId = raw?.sale_id ?? raw?.id

      setProducts((previous) => {
        const next = previous.map((product) => {
          const line = sold.find((item) => item.product_id === product.product_id)
          return line ? { ...product, quantity: Math.max(0, product.quantity - line.quantity) } : product
        })
        void cacheProducts(businessId, next)
        return next
      })

      setCart([])
      setPaymentMethod('cash')
      setScanNotice(null)
      idempotencyKeyRef.current = ''
      setFlash({ text: `Sale completed — ${formatMoney(total)}`, at: Date.now() })
      setNotice(`Sale completed successfully${savedSaleId != null ? ` (#${savedSaleId})` : ''}.`)

      if (savedSaleId != null && Number.isFinite(Number(savedSaleId))) {
        setReceiptSaleId(Number(savedSaleId))
      }
    } catch (err) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setCart([])
        setPaymentMethod('cash')
        setScanNotice(null)
        idempotencyKeyRef.current = ''
        setNotice('Sale saved offline. It will sync automatically when you are back online.')
        void requestBackgroundSync()
      } else {
        setError(parseApiError(err) || 'Could not complete the sale. The cart has been kept so you can retry.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Point of sale"
        title="POS"
        subtitle="Scan products continuously. The cart updates instantly — no product names or quantities to type."
        backLink={`/business/${businessId}/sales`}
        backLabel="Back to sales"
        actions={
          <Button variant="secondary" onClick={() => router.push(`/business/${businessId}/sales`)}>
            Sales list
          </Button>
        }
      />

      {error && (
        <Alert kind="error" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert kind="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {catalogueWarning && <Alert kind="warning">{catalogueWarning}</Alert>}

      {flash && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4" aria-live="polite">
          <div className="animate-fade-up rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {flash.text}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">
          <section className="surface-card p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScanIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-section-title text-slate-900">Ready to scan products</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-light">
                  Point the camera at a barcode, or use a USB/Bluetooth scanner. The scanner stays active between items.
                </p>
              </div>
            </div>

            {catalogueLoading ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surfaceAlt px-4 py-6 text-sm text-neutral-light">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                Loading your product catalogue…
              </div>
            ) : (
              <PosScanner onScan={handleScan} paused={submitting} />
            )}
          </section>

          {scanNotice && (
            <Alert kind="warning" title="Barcode not in your inventory">
              <p>
                <span className="font-mono">{scanNotice.barcode}</span> does not match a product in this business.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {scanNotice.canCreate ? (
                  <Button size="sm" onClick={() => setPendingQuickAdd({ barcode: scanNotice.barcode })}>
                    Add this product
                  </Button>
                ) : (
                  <p className="text-xs">Ask a manager to add it to the inventory before selling it.</p>
                )}
                <Button size="sm" variant="secondary" onClick={() => setScanNotice(null)}>
                  Dismiss
                </Button>
              </div>
            </Alert>
          )}

          <section className="surface-card p-4 sm:p-5">
            <h2 className="text-section-title text-slate-900">Built for a busy counter</h2>
            <ul className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <li className="rounded-xl bg-surfaceAlt p-3">
                <span className="font-medium text-slate-900">One scan, one unit.</span> Repeated camera detections are ignored until the barcode leaves the frame.
              </li>
              <li className="rounded-xl bg-surfaceAlt p-3">
                <span className="font-medium text-slate-900">Instant identification.</span> Barcodes are matched against this business’s catalogue on the device.
              </li>
              <li className="rounded-xl bg-surfaceAlt p-3">
                <span className="font-medium text-slate-900">Adjust before paying.</span> Use + and − to correct quantities, or remove a mistaken item.
              </li>
              <li className="rounded-xl bg-surfaceAlt p-3">
                <span className="font-medium text-slate-900">One atomic sale.</span> The whole cart is submitted together, never one request per scan.
              </li>
            </ul>
          </section>
        </div>

        <section className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="surface-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-section-title text-slate-900">Current sale</h2>
                <p className="mt-0.5 text-xs text-neutral-light">
                  {totals.lineCount} line{totals.lineCount === 1 ? '' : 's'} · {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'}
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearSale}
                  className="text-xs font-medium text-danger transition-colors hover:text-rose-700"
                >
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScanIcon className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">No items scanned yet</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-neutral-light">
                  Scan a product and it will appear here with its price and quantity.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cart.map((item) => {
                  const isOverStock = overStock.some((line) => line.product_id === item.product_id)
                  return (
                    <li key={item.product_id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-medium text-slate-900">
                            <span className="truncate">{item.name}</span>
                            {item.pending && (
                              <span className="shrink-0 text-[11px] font-medium text-amber-600">Saving…</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-light">
                            {formatMoney(item.price)} each
                            {item.barcode ? <span className="font-mono"> · {item.barcode}</span> : null}
                          </p>
                          {isOverStock && (
                            <p className="mt-1 text-xs font-medium text-danger">
                              Only {item.stock} {item.unit} in stock
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-900">
                          {formatMoney(item.price * item.quantity)}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => decrement(item)}
                            aria-label={`Reduce quantity of ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center text-lg font-medium text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] text-center text-sm font-semibold text-slate-900" aria-label={`Quantity of ${item.name}`}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increment(item)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center text-lg font-medium text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          aria-label={`Remove ${item.name}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-danger"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="surface-card space-y-4 p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-light">Total items</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{totals.itemCount}</p>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-light">Total amount</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{formatMoney(totals.total)}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Payment method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash', label: 'Cash' },
                  { value: 'mobile_money', label: 'MoMo' },
                  { value: 'card', label: 'Card' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => choosePaymentMethod(option.value)}
                    className={`min-h-[42px] rounded-xl text-sm font-medium transition-all ${
                      paymentMethod === option.value
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {overStock.length > 0 && (
              <Alert kind="warning">
                Reduce the highlighted item{totals.lineCount === 1 ? '' : 's'} to the available stock before completing the sale.
              </Alert>
            )}

            <Button
              fullWidth
              size="lg"
              onClick={completeSale}
              loading={submitting}
              disabled={!sellable}
            >
              Complete sale
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-neutral-light">
              The sale, stock deduction and payment are saved together in one request.
            </p>
          </div>
        </section>
      </div>

      {pendingQuickAdd && (
        <QuickAddProductModal
          businessId={businessId}
          initialBarcode={pendingQuickAdd.barcode}
          onClose={() => setPendingQuickAdd(null)}
          onCreated={handleQuickProductCreated}
          onSaved={handleQuickProductSaved}
          onSaveFailed={handleQuickProductFailed}
        />
      )}

      {receiptSaleId != null && (
        <SaleReceiptModal
          businessId={businessId}
          saleId={receiptSaleId}
          onClose={() => setReceiptSaleId(null)}
        />
      )}
    </div>
  )
}
