import {
  filterProducts,
  inventoryStatus,
  isLowStock,
  isOutOfStock,
  lowStockThreshold,
  marginPercent,
  productQuantity,
  sortProducts,
  stockLevelPercent,
  stockValue,
  summarizeInventory,
} from '@/lib/products'
import type { Product } from '@/lib/types'

function product(overrides: Partial<Product> = {}): Product {
  return {
    product_id: 1,
    name: 'Rice',
    price: 50,
    cost_price: 30,
    quantity: 20,
    unit: 'bags',
    low_stock_threshold: 10,
    category: 'Grains',
    ...overrides,
  }
}

describe('product stock helpers', () => {
  it('falls back to a threshold of 10 when the value is missing or invalid', () => {
    expect(lowStockThreshold(product())).toBe(10)
    expect(lowStockThreshold(product({ low_stock_threshold: undefined }))).toBe(10)
    expect(lowStockThreshold(product({ low_stock_threshold: null as any }))).toBe(10)
    expect(lowStockThreshold(product({ low_stock_threshold: '' as any }))).toBe(10)
    expect(lowStockThreshold(product({ low_stock_threshold: -2 }))).toBe(10)
    expect(lowStockThreshold(product({ low_stock_threshold: 0 }))).toBe(0)
  })

  it('treats missing, invalid and negative quantities as zero', () => {
    expect(productQuantity(product({ quantity: undefined as any }))).toBe(0)
    expect(productQuantity(product({ quantity: Number.NaN }))).toBe(0)
    expect(productQuantity(product({ quantity: -5 }))).toBe(-5)
    expect(isOutOfStock(product({ quantity: -5 }))).toBe(true)
  })

  it('classifies in-stock, low-stock and out-of-stock products', () => {
    expect(inventoryStatus(product({ quantity: 21 }))).toBe('in_stock')
    expect(inventoryStatus(product({ quantity: 11 }))).toBe('in_stock')
    expect(inventoryStatus(product({ quantity: 10 }))).toBe('low_stock')
    expect(inventoryStatus(product({ quantity: 1 }))).toBe('low_stock')
    expect(inventoryStatus(product({ quantity: 0 }))).toBe('out_of_stock')
    expect(isLowStock(product({ quantity: 10 }))).toBe(true)
    expect(isLowStock(product({ quantity: 11 }))).toBe(false)
  })

  it('uses a custom reorder point', () => {
    expect(inventoryStatus(product({ quantity: 6, low_stock_threshold: 5 }))).toBe('in_stock')
    expect(inventoryStatus(product({ quantity: 5, low_stock_threshold: 5 }))).toBe('low_stock')
  })
})

describe('product value helpers', () => {
  it('calculates margin as a percentage of selling price', () => {
    expect(marginPercent(product({ price: 50, cost_price: 30 }))).toBe(40)
    expect(marginPercent(product({ price: 0, cost_price: 30 }))).toBeNull()
    expect(marginPercent(product({ price: 50, cost_price: 60 }))).toBe(-20)
  })

  it('values stock at cost or at retail', () => {
    expect(stockValue(product({ quantity: 4 }), 'cost')).toBe(120)
    expect(stockValue(product({ quantity: 4 }), 'retail')).toBe(200)
    expect(stockValue(product({ quantity: 4, cost_price: Number.NaN }), 'cost')).toBe(0)
  })

  it('caps the stock meter between 0 and 100', () => {
    expect(stockLevelPercent(product({ quantity: 0 }))).toBe(0)
    expect(stockLevelPercent(product({ quantity: 10 }))).toBe(50)
    expect(stockLevelPercent(product({ quantity: 20 }))).toBe(100)
    expect(stockLevelPercent(product({ quantity: 200 }))).toBe(100)
  })
})

describe('summarizeInventory', () => {
  it('counts stock states, units and value across the catalogue', () => {
    const summary = summarizeInventory([
      product({ product_id: 1, quantity: 20 }),
      product({ product_id: 2, quantity: 5, price: 20, cost_price: 10 }),
      product({ product_id: 3, quantity: 0, price: 100, cost_price: 80 }),
      product({ product_id: 4, quantity: 10, price: 40, cost_price: 20, is_active: false }),
    ])

    expect(summary.total).toBe(4)
    expect(summary.inStock).toBe(1)
    expect(summary.lowStock).toBe(2)
    expect(summary.outOfStock).toBe(1)
    expect(summary.inactive).toBe(1)
    expect(summary.totalUnits).toBe(35)
    expect(summary.costValue).toBe(850)
    expect(summary.retailValue).toBe(1500)
    expect(summary.potentialProfit).toBe(650)
    expect(summary.blendedMargin).toBeCloseTo(43.333, 3)
  })

  it('returns zeroed metrics for an empty catalogue', () => {
    expect(summarizeInventory([])).toMatchObject({
      total: 0,
      totalUnits: 0,
      costValue: 0,
      retailValue: 0,
      blendedMargin: 0,
    })
  })
})

describe('filterProducts', () => {
  const products = [
    product({ product_id: 1, name: 'Rice Bag', sku: 'RIC-01', category: 'Grains' }),
    product({ product_id: 2, name: 'Brown Beans', sku: 'BEA-02', category: 'Legumes', quantity: 5 }),
    product({ product_id: 3, name: 'Tomato Sauce', sku: 'TOM-03', category: 'Canned', quantity: 0 }),
    product({ product_id: 4, name: 'Rice Flour', sku: 'RIC-04', category: 'Grains', quantity: 12 }),
  ]

  it('matches names, SKUs and categories without case sensitivity', () => {
    expect(filterProducts(products, { search: 'rice' }).map((p) => p.product_id)).toEqual([1, 4])
    expect(filterProducts(products, { search: 'BEA-02' }).map((p) => p.product_id)).toEqual([2])
    expect(filterProducts(products, { search: 'canned' }).map((p) => p.product_id)).toEqual([3])
  })

  it('filters by category and stock status together', () => {
    expect(filterProducts(products, { category: 'Grains' }).map((p) => p.product_id)).toEqual([1, 4])
    expect(filterProducts(products, { status: 'low_stock' }).map((p) => p.product_id)).toEqual([2])
    expect(filterProducts(products, { category: 'Grains', status: 'low_stock' })).toEqual([])
    expect(filterProducts(products, { status: 'out_of_stock' }).map((p) => p.product_id)).toEqual([3])
  })

  it('returns every product with no filters', () => {
    expect(filterProducts(products)).toHaveLength(4)
  })
})

describe('sortProducts', () => {
  const products = [
    product({ product_id: 1, name: 'Zebra Rice', quantity: 5, price: 50, cost_price: 40 }),
    product({ product_id: 2, name: 'Ama Beans', quantity: 20, price: 10, cost_price: 9 }),
    product({ product_id: 3, name: 'Mango Juice', quantity: 10, price: 25, cost_price: 25 }),
    product({ product_id: 4, name: 'No Price', quantity: 3, price: 0, cost_price: 2 }),
  ]

  it('sorts by name in both directions', () => {
    expect(sortProducts(products, 'name', 'asc').map((p) => p.product_id)).toEqual([2, 3, 4, 1])
    expect(sortProducts(products, 'name', 'desc').map((p) => p.product_id)).toEqual([1, 4, 3, 2])
  })

  it('sorts by quantity and stock value', () => {
    expect(sortProducts(products, 'quantity', 'asc').map((p) => p.product_id)).toEqual([4, 1, 3, 2])
    expect(sortProducts(products, 'quantity', 'desc').map((p) => p.product_id)).toEqual([2, 3, 1, 4])
    expect(sortProducts(products, 'value', 'desc').map((p) => p.product_id)).toEqual([3, 1, 2, 4])
  })

  it('sorts by margin and keeps products without a margin at the end', () => {
    expect(sortProducts(products, 'margin', 'desc').map((p) => p.product_id)).toEqual([1, 2, 3, 4])
    expect(sortProducts(products, 'margin', 'asc').map((p) => p.product_id)).toEqual([3, 2, 1, 4])
  })

  it('does not mutate the input array', () => {
    const input = [...products]
    sortProducts(input, 'quantity', 'desc')
    expect(input.map((p) => p.product_id)).toEqual([1, 2, 3, 4])
  })
})
