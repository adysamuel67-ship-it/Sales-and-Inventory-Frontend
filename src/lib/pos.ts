import type { Product } from './types'

export interface PosCartItem {
  product_id: number
  name: string
  price: number
  quantity: number
  stock: number
  unit: string
  barcode?: string | null
  pending?: boolean
}

export interface ScannedProduct {
  product_id: number
  name: string
  price: number
  quantity: number
  unit?: string
  barcode?: string | null
  pending?: boolean
}

export interface CartTotals {
  itemCount: number
  lineCount: number
  subtotal: number
  total: number
}

export function toPosCartItem(product: Product): PosCartItem {
  return {
    product_id: product.product_id,
    name: product.name,
    price: Number(product.price || 0),
    quantity: 1,
    stock: Number(product.quantity || 0),
    unit: product.unit || 'units',
    barcode: product.barcode,
    pending: product.pending,
  }
}

/**
 * Adds one unit of a product to the cart. The product id is the cart key, so
 * scanning the same item repeatedly increments its quantity instead of adding
 * duplicate rows.
 */
export function addToCart(cart: PosCartItem[], product: ScannedProduct, quantity = 1): PosCartItem[] {
  const qty = Math.max(1, Math.floor(quantity) || 1)
  const existing = cart.find((item) => item.product_id === product.product_id)

  if (existing) {
    return cart.map((item) =>
      item.product_id === product.product_id
        ? {
            ...item,
            name: product.name,
            price: Number(product.price || 0),
            stock: Number(product.quantity || 0),
            quantity: item.quantity + qty,
            pending: product.pending,
          }
        : item
    )
  }

  return [
    ...cart,
    {
      product_id: product.product_id,
      name: product.name,
      price: Number(product.price || 0),
      stock: Number(product.quantity || 0),
      quantity: qty,
      unit: product.unit || 'units',
      barcode: product.barcode,
      pending: product.pending,
    },
  ]
}

/** Sets an exact quantity. Zero or less removes the row entirely. */
export function updateCartQuantity(cart: PosCartItem[], productId: number, quantity: number): PosCartItem[] {
  const next = Math.floor(Number(quantity) || 0)
  if (next <= 0) return removeFromCart(cart, productId)
  return cart.map((item) => (item.product_id === productId ? { ...item, quantity: next } : item))
}

export function removeFromCart(cart: PosCartItem[], productId: number): PosCartItem[] {
  return cart.filter((item) => item.product_id !== productId)
}

export function cartTotals(cart: PosCartItem[]): CartTotals {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return { itemCount, lineCount: cart.length, subtotal, total: subtotal }
}

export function overStockItems(cart: PosCartItem[]): PosCartItem[] {
  return cart.filter((item) => item.quantity > item.stock)
}

export function isCartSellable(cart: PosCartItem[]): boolean {
  return cart.length > 0 && cart.every((item) => item.quantity > 0) && overStockItems(cart).length === 0
}

/** Builds the in-memory barcode index used for instant local identification. */
export function buildBarcodeIndex(products: Product[]): Map<string, Product> {
  const index = new Map<string, Product>()
  for (const product of products) {
    const barcode = (product.barcode || '').trim()
    if (barcode) index.set(barcode, product)
  }
  return index
}

export interface ScanGuardOptions {
  /** How long a barcode may stay absent before it can be accepted again. */
  releaseMs?: number
  /** Hard floor between accepted scans of the same barcode. */
  cooldownMs?: number
}

/**
 * Turns camera detections into accepted scan events.
 *
 * A detector reports the same barcode on every frame while a product is held
 * in front of the camera. Only the first report counts; the barcode re-arms
 * once it leaves the frame for `releaseMs`, so presenting the same item again
 * adds another unit. `cooldownMs` also ignores implausibly fast repeats from
 * a keyboard-wedge scanner.
 */
export class ScanGuard {
  private readonly releaseMs: number
  private readonly cooldownMs: number
  private readonly seenAt = new Map<string, number>()
  private readonly held = new Set<string>()
  private readonly lastAcceptedAt = new Map<string, number>()

  constructor({ releaseMs = 1200, cooldownMs = 1500 }: ScanGuardOptions = {}) {
    this.releaseMs = releaseMs
    this.cooldownMs = cooldownMs
  }

  accept(rawCode: string, now = Date.now()): boolean {
    const code = (rawCode || '').trim()
    if (!code) return false

    this.prune(now)
    this.seenAt.set(code, now)

    if (this.held.has(code)) return false

    const lastAccepted = this.lastAcceptedAt.get(code)
    if (lastAccepted != null && now - lastAccepted < this.cooldownMs) return false

    this.held.add(code)
    this.lastAcceptedAt.set(code, now)
    return true
  }

  /** Called while the camera is idle so absent barcodes can be re-armed. */
  prune(now = Date.now()): void {
    for (const [code, seen] of this.seenAt) {
      if (now - seen > this.releaseMs) {
        this.seenAt.delete(code)
        this.held.delete(code)
      }
    }
  }

  reset(): void {
    this.seenAt.clear()
    this.held.clear()
    this.lastAcceptedAt.clear()
  }
}
