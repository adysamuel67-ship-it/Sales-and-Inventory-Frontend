import type { Product } from './types'

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type StockFilter = InventoryStatus | 'all'
export type ProductView = 'active' | 'deleted'
export type ProductSortKey = 'name' | 'quantity' | 'price' | 'cost_price' | 'value' | 'margin'
export type SortDirection = 'asc' | 'desc'

export interface ProductFilterOptions {
  search?: string
  category?: string
  status?: StockFilter
}

export interface InventorySummary {
  total: number
  inStock: number
  lowStock: number
  outOfStock: number
  inactive: number
  totalUnits: number
  costValue: number
  retailValue: number
  potentialProfit: number
  blendedMargin: number
}

/** Reorder point, falling back to 10 when the product has no valid threshold. */
export function lowStockThreshold(product: Pick<Product, 'low_stock_threshold'>): number {
  const raw = product.low_stock_threshold
  if (raw == null || raw === ('' as unknown as number)) return 10
  const threshold = Number(raw)
  return Number.isFinite(threshold) && threshold >= 0 ? threshold : 10
}

export function productQuantity(product: Pick<Product, 'quantity'>): number {
  const quantity = Number(product.quantity)
  return Number.isFinite(quantity) ? quantity : 0
}

export function isOutOfStock(product: Pick<Product, 'quantity'>): boolean {
  return productQuantity(product) <= 0
}

export function isLowStock(product: Pick<Product, 'quantity' | 'low_stock_threshold'>): boolean {
  return !isOutOfStock(product) && productQuantity(product) <= lowStockThreshold(product)
}

export function inventoryStatus(
  product: Pick<Product, 'quantity' | 'low_stock_threshold'>
): InventoryStatus {
  if (isOutOfStock(product)) return 'out_of_stock'
  if (isLowStock(product)) return 'low_stock'
  return 'in_stock'
}

/** Gross margin as a percentage of selling price, or null when no price is set. */
export function marginPercent(product: Pick<Product, 'price' | 'cost_price'>): number | null {
  const price = Number(product.price)
  if (!Number.isFinite(price) || price <= 0) return null
  const cost = Number(product.cost_price)
  return ((price - (Number.isFinite(cost) ? cost : 0)) / price) * 100
}

/** Value of stock on hand at cost (default) or at the current selling price. */
export function stockValue(
  product: Pick<Product, 'quantity' | 'price' | 'cost_price'>,
  basis: 'cost' | 'retail' = 'cost'
): number {
  const quantity = productQuantity(product)
  const unitValue = Number(basis === 'retail' ? product.price : product.cost_price)
  return quantity * (Number.isFinite(unitValue) ? unitValue : 0)
}

/** Width for the stock-level meter, scaled so twice the reorder point is full. */
export function stockLevelPercent(
  product: Pick<Product, 'quantity' | 'low_stock_threshold'>
): number {
  const target = Math.max(lowStockThreshold(product) * 2, 1)
  return Math.max(0, Math.min(100, Math.round((productQuantity(product) / target) * 100)))
}

export function summarizeInventory(products: Product[]): InventorySummary {
  const summary: InventorySummary = {
    total: products.length,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    inactive: 0,
    totalUnits: 0,
    costValue: 0,
    retailValue: 0,
    potentialProfit: 0,
    blendedMargin: 0,
  }

  for (const product of products) {
    const status = inventoryStatus(product)
    if (status === 'in_stock') summary.inStock += 1
    if (status === 'low_stock') summary.lowStock += 1
    if (status === 'out_of_stock') summary.outOfStock += 1
    if (product.is_active === false) summary.inactive += 1

    const quantity = productQuantity(product)
    const cost = Number(product.cost_price)
    const price = Number(product.price)
    const safeCost = Number.isFinite(cost) ? cost : 0
    const safePrice = Number.isFinite(price) ? price : 0

    summary.totalUnits += quantity
    summary.costValue += quantity * safeCost
    summary.retailValue += quantity * safePrice
    summary.potentialProfit += quantity * (safePrice - safeCost)
  }

  summary.blendedMargin =
    summary.retailValue > 0 ? (summary.potentialProfit / summary.retailValue) * 100 : 0

  return summary
}

export function filterProducts(
  products: Product[],
  { search = '', category = '', status = 'all' }: ProductFilterOptions = {}
): Product[] {
  const query = search.trim().toLowerCase()

  return products.filter((product) => {
    if (status !== 'all' && inventoryStatus(product) !== status) return false
    if (category && product.category !== category) return false
    if (!query) return true

    const haystack = [product.name, product.sku, product.barcode, product.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}

function sortableValue(product: Product, key: ProductSortKey): number | string | null {
  switch (key) {
    case 'name':
      return (product.name || '').toLowerCase()
    case 'quantity':
      return productQuantity(product)
    case 'price':
      return Number(product.price) || 0
    case 'cost_price':
      return Number(product.cost_price) || 0
    case 'value':
      return stockValue(product)
    case 'margin':
      return marginPercent(product)
    default:
      return null
  }
}

export function sortProducts(
  products: Product[],
  key: ProductSortKey = 'name',
  direction: SortDirection = 'asc'
): Product[] {
  const multiplier = direction === 'asc' ? 1 : -1

  return [...products].sort((a, b) => {
    const left = sortableValue(a, key)
    const right = sortableValue(b, key)

    if (left == null && right == null) return (a.name || '').localeCompare(b.name || '')
    if (left == null) return 1
    if (right == null) return -1

    const result =
      typeof left === 'string' || typeof right === 'string'
        ? String(left).localeCompare(String(right))
        : left - right

    if (result !== 0) return result * multiplier
    return (a.name || '').localeCompare(b.name || '')
  })
}
