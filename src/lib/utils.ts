export const paymentLabel: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'MoMo',
  card: 'Card',
}

export function formatPayment(method: string): string {
  const lower = (method || '').toLowerCase()
  return paymentLabel[lower] || method
}

export function extractArray(data: any, depth = 0): any[] {
  if (depth > 3) return []
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object') {
        const found = extractArray(data[key], depth + 1)
        if (found.length > 0) return found
      }
    }
  }
  return []
}

export interface MappedSale {
  id: number
  product: string
  qty: number
  amount: number
  payment: string
  time: string
  created_at?: string
  amount_paid?: number
  payment_status?: string
  customer_id?: number
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  user_id?: number
  sold_by_name?: string
  note?: string
  sales_items?: any[]
  raw?: any
  pending?: boolean
}

export function mapSale(raw: any, productMap?: Map<number, string>, userMap?: Map<number, string>): MappedSale {
  const items = (raw.sales_items || []).map((i: any) => {
    let resolvedName = i.product_name || i.name
    if (!resolvedName) {
      const pid = i.product_id ?? i.productId
      if (pid != null && productMap && productMap.has(pid)) {
        resolvedName = productMap.get(pid)!
      } else if (pid != null) {
        resolvedName = `Product #${pid}`
      }
    }
    return { ...i, product_name: resolvedName || i.product_name || i.name }
  })
  const productNames = items.map((i: any) => i.product_name || i.name).join(', ')
  const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0)
  const userId = raw.user_id ?? raw.raw?.user_id
  return {
    id: raw.sale_id ?? raw.id,
    product: productNames || raw.product_name || raw.product || 'Unknown',
    qty: totalQty || raw.quantity || raw.qty || 0,
    amount: raw.total_amount ?? raw.amount ?? 0,
    payment: (raw.payment_method || raw.payment || 'N/A').toLowerCase(),
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleString()
      : raw.time || '',
    created_at: raw.created_at,
    amount_paid: raw.amount_paid != null ? Number(raw.amount_paid) : undefined,
    payment_status: raw.payment_status || undefined,
    customer_id: raw.customer_id ?? raw.customer?.customer_id ?? raw.customer?.id ?? undefined,
    customer_name: raw.customer_name ?? raw.customer?.name ?? raw.customer?.customer_name ?? undefined,
    customer_phone: raw.customer_phone ?? raw.customer?.phone ?? raw.customer?.phone_number ?? raw.customer?.mobile ?? undefined,
    customer_email: raw.customer_email ?? raw.customer?.email ?? undefined,
    user_id: userId != null ? Number(userId) : undefined,
    sold_by_name: userId != null && userMap?.has(Number(userId)) ? userMap.get(Number(userId)) : undefined,
    note: raw.note || undefined,
    sales_items: items.length > 0 ? items : undefined,
    raw,
  }
}

export function mapLowStock(raw: any) {
  return {
    name: raw.name || raw.product_name || 'Unknown',
    stock: raw.quantity ?? raw.stock ?? 0,
    threshold: raw.low_stock_threshold ?? raw.threshold ?? raw.reorder_level ?? 10,
    unit: raw.unit || 'units',
  }
}

export function normalizeProduct(raw: any) {
  return {
    ...raw,
    product_id: raw.product_id ?? raw.id,
    price: raw.price ?? 0,
    cost_price: raw.cost_price ?? 0,
    quantity: raw.quantity ?? raw.stock ?? 0,
    unit: raw.unit || 'units',
  }
}

export function extractSummary(data: any): {
  total_revenue: number
  total_profit: number
  total_sales: number
  total_products: number
} | null {
  if (!data || typeof data !== 'object') return null
  const d = data.data || data
  const revenue = d.total_revenue ?? d.revenue ?? d.total_amount ?? null
  const profit = d.total_profit ?? d.profit ?? d.net_profit ?? null
  const sales = d.total_sales ?? d.sales ?? d.sales_count ?? null
  const products = d.total_active_products ?? d.total_products ?? d.products ?? null
  if (revenue === null && profit === null && sales === null && products === null) return null
  return {
    total_revenue: Number(revenue ?? 0),
    total_profit: Number(profit ?? 0),
    total_sales: Number(sales ?? 0),
    total_products: Number(products ?? 0),
  }
}

export function extractProfit(data: any) {
  if (!data || typeof data !== 'object') return null
  const d = data.data || data
  const revenue = d.total_revenue ?? d.revenue ?? d.total_amount ?? null
  const cost = d.total_cost ?? d.cost ?? d.total_cost_of_goods ?? null
  const profit = d.total_profit ?? d.profit ?? d.net_profit ?? null
  if (revenue === null && profit === null) return null
  return {
    total_revenue: Number(revenue ?? 0),
    total_cost: Number(cost ?? 0),
    total_profit: Number(profit ?? 0),
    items_sold: d.items_sold ?? d.quantity_sold ?? undefined,
    sales_count: d.sales_count ?? d.total_sales ?? undefined,
  }
}

export function getDateRange(daysAgo: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - daysAgo)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

export function generateDateLabels(startDate: string, endDate: string): string[] {
  const labels: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    labels.push(d.toISOString().split('T')[0])
  }
  return labels
}

export interface ProductPerformance {
  product_id: number
  name: string
  quantity: number
  revenue: number
  profit: number
  /** Share of total units sold across the whole period, 0-100. */
  share: number
}

/**
 * Rolls sale line items up into a per-product performance table.
 *
 * The analytics endpoints only expose a single `best_selling_product` *name*
 * (analytics/service.py groups by product and takes the top row), so a ranked
 * list has to be built from the sale line items the sales endpoint already
 * returns. `SaleResponse.sales_items` carries product_id, quantity,
 * unit_price, subtotal and profit - everything needed here.
 *
 * `productMap` supplies names when the line item omits one, which happens for
 * older rows.
 *
 * Ranked by quantity, which is how a shopkeeper reads "best selling".
 */
export function aggregateProductPerformance(
  sales: any[],
  productMap?: Map<number, string>
): ProductPerformance[] {
  const rows = new Map<number, ProductPerformance>()

  for (const sale of sales || []) {
    const items = sale?.sales_items || sale?.raw?.sales_items || []
    if (!Array.isArray(items) || items.length === 0) continue

    for (const item of items) {
      const pid = Number(item.product_id ?? item.productId)
      if (!pid || Number.isNaN(pid)) continue

      const quantity = Number(item.quantity ?? 0)
      // SaleItemResponse always sends subtotal, but older or partially populated
      // rows only carry unit_price, so derive the line value when needed.
      const revenue = item.subtotal != null
        ? Number(item.subtotal)
        : Number(item.unit_price ?? 0) * quantity
      const profit = Number(item.profit ?? 0)

      const name =
        item.product_name ||
        item.name ||
        productMap?.get(pid) ||
        `Product #${pid}`

      const existing = rows.get(pid)
      if (existing) {
        existing.quantity += quantity
        existing.revenue += revenue
        existing.profit += profit
        // Prefer a real name over the placeholder if a later row has one.
        if (existing.name.startsWith('Product #') && !name.startsWith('Product #')) {
          existing.name = name
        }
      } else {
        rows.set(pid, { product_id: pid, name, quantity, revenue, profit, share: 0 })
      }
    }
  }

  const ranked = [...rows.values()].sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity
    return b.revenue - a.revenue
  })

  const totalUnits = ranked.reduce((sum, r) => sum + r.quantity, 0)
  return ranked.map((r) => ({
    ...r,
    quantity: Number(r.quantity.toFixed(2)),
    revenue: Number(r.revenue.toFixed(2)),
    profit: Number(r.profit.toFixed(2)),
    share: totalUnits > 0 ? Number(((r.quantity / totalUnits) * 100).toFixed(1)) : 0,
  }))
}

export function parseApiError(err: any): string {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((e: any) => e.msg).join(', ')
  }
  if (typeof detail === 'string') return detail
  return err?.message || 'An error occurred'
}

export function formatNumber(value: number | string | null | undefined): string {
  const num = Number(value ?? 0)
  return isNaN(num) ? '0' : num.toLocaleString()
}

export function formatCedi(value: number | string | null | undefined, fractionDigits = 2): string {
  const num = Number(value ?? 0)
  return isNaN(num)
    ? `GH₵${(0).toFixed(fractionDigits)}`
    : `GH₵${num.toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })}`
}

export const SUPER_ADMIN_EMAIL = 'adysamuel68@gmail.com'

export function isSuperAdminUser(user?: { role?: string; email?: string } | null): boolean {
  if (!user) return false
  if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return true
  return user.role === 'super_admin'
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'manager' ||
    role === 'ADMIN' || role === 'OWNER' || role === 'owner'
}

export function isManagerRole(role?: string): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'manager' ||
    role === 'ADMIN' || role === 'OWNER' || role === 'owner'
}

export function isStaffRole(role?: string): boolean {
  return role === 'cashier' || role === 'viewer' || role === 'STAFF' || role === 'staff'
}

export function isPlatformAdmin(user?: { role?: string; email?: string } | null): boolean {
  if (!user) return false
  if (isSuperAdminUser(user)) return true
  return user.role === 'admin' || user.role === 'ADMIN'
}

// A trader who is "just trying it" does not need the full menu. Eight items on
// day one reads as a tool they have to learn rather than one they can use, and
// every unfamiliar entry is another reason to close the tab. Chat and Reports
// are the two that reward a shop with real data, so they stay hidden until the
// account has had time to settle.
export const NEW_ACCOUNT_WINDOW_DAYS = 14

export function isNewAccount(
  user?: { created_at?: string; email?: string; role?: string } | null,
  now: number = Date.now()
): boolean {
  // Fails open. An account with no usable join date keeps the full menu, so a
  // missing field can never quietly hide features from an established shop.
  if (!user?.created_at) return false
  if (isSuperAdminUser(user)) return false
  const joined = new Date(user.created_at).getTime()
  if (isNaN(joined)) return false
  return now - joined <= NEW_ACCOUNT_WINDOW_DAYS * 24 * 60 * 60 * 1000
}
