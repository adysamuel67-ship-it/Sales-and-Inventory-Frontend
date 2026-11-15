import {
  ScanGuard,
  addToCart,
  buildBarcodeIndex,
  cartTotals,
  isCartSellable,
  overStockItems,
  removeFromCart,
  updateCartQuantity,
} from '@/lib/pos'
import type { Product } from '@/lib/types'

function product(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    name: 'Coca-Cola 500ml',
    price: 15,
    cost_price: 10,
    quantity: 10,
    unit: 'bottles',
    barcode: '1111111111111',
    ...overrides,
  }
}

describe('POS cart', () => {
  it('increments an existing product instead of adding a duplicate row', () => {
    let cart = addToCart([], product(), 1)
    cart = addToCart(cart, product(), 1)
    cart = addToCart(cart, product({ product_id: 2, name: 'Biscuit', price: 8, barcode: '222' }), 1)

    expect(cart).toHaveLength(2)
    expect(cart[0]).toMatchObject({ product_id: 1, name: 'Coca-Cola 500ml', quantity: 2 })
    expect(cart[1]).toMatchObject({ product_id: 2, quantity: 1 })
  })

  it('calculates item count and total from quantity, not row count', () => {
    let cart = addToCart([], product(), 3)
    cart = addToCart(cart, product({ product_id: 2, name: 'Biscuit', price: 8, barcode: '222' }), 2)

    expect(cartTotals(cart)).toEqual({
      itemCount: 5,
      lineCount: 2,
      subtotal: 61,
      total: 61,
    })
  })

  it('updates and removes quantities independently', () => {
    let cart = addToCart([], product(), 2)
    cart = updateCartQuantity(cart, 1, 5)
    expect(cart[0].quantity).toBe(5)

    cart = updateCartQuantity(cart, 1, 0)
    expect(cart).toHaveLength(0)

    cart = addToCart([], product(), 1)
    expect(removeFromCart(cart, 1)).toEqual([])
  })

  it('blocks completing a sale when a line exceeds stock', () => {
    const cart = addToCart([], product({ quantity: 1 }), 2)

    expect(overStockItems(cart)).toHaveLength(1)
    expect(isCartSellable(cart)).toBe(false)
  })

  it('builds a barcode index and ignores blank barcodes', () => {
    const index = buildBarcodeIndex([
      product(),
      product({ product_id: 2, barcode: '' }),
      product({ product_id: 3, barcode: '333' }),
    ])

    expect(index.size).toBe(2)
    expect(index.get('1111111111111')?.product_id).toBe(1)
    expect(index.get('333')?.product_id).toBe(3)
  })
})

describe('ScanGuard', () => {
  it('accepts a barcode once while it stays in the camera frame', () => {
    const guard = new ScanGuard()
    const accepted = [
      guard.accept('111', 1000),
      guard.accept('111', 1100),
      guard.accept('111', 1200),
      guard.accept('111', 1300),
    ]

    expect(accepted).toEqual([true, false, false, false])
  })

  it('re-arms the same barcode after it leaves the frame', () => {
    const guard = new ScanGuard({ releaseMs: 800, cooldownMs: 500 })

    expect(guard.accept('111', 1000)).toBe(true)
    // No detections for longer than the release window: the guard re-arms.
    guard.prune(2000)
    expect(guard.accept('111', 2100)).toBe(true)
  })

  it('accepts different barcodes without waiting', () => {
    const guard = new ScanGuard()

    expect(guard.accept('111', 1000)).toBe(true)
    expect(guard.accept('222', 1010)).toBe(true)
  })

  it('ignores an implausibly fast re-scan even after release', () => {
    const guard = new ScanGuard({ releaseMs: 100, cooldownMs: 1500 })

    expect(guard.accept('111', 1000)).toBe(true)
    expect(guard.accept('111', 1200)).toBe(false)
    expect(guard.accept('111', 2600)).toBe(true)
  })
})
