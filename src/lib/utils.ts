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
  note?: string
  sales_items?: any[]
  raw?: any
}

export function mapSale(raw: any, productMap?: Map<number, string>): MappedSale {
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
  return {
    id: raw.sale_id ?? raw.id,
    product: productNames || raw.product_name || raw.product || 'Unknown',
    qty: totalQty || raw.quantity || raw.qty || 0,
    amount: raw.total_amount ?? raw.amount ?? 0,
    payment: raw.payment_method || raw.payment || 'N/A',
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleString()
      : raw.time || '',
    created_at: raw.created_at,
    amount_paid: raw.amount_paid != null ? Number(raw.amount_paid) : undefined,
    payment_status: raw.payment_status || undefined,
    customer_id: raw.customer_id ?? raw.customer?.customer_id ?? undefined,
    customer_name: raw.customer_name ?? raw.customer?.name ?? undefined,
    note: raw.note || undefined,
    sales_items: items.length > 0 ? items : undefined,
    raw,
  }
}

export function mapLowStock(raw: any) {
  return {
    name: raw.name || raw.product_name || 'Unknown',
    stock: raw.quantity ?? raw.stock ?? 0,
    threshold: raw.threshold ?? raw.reorder_level ?? 10,
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

export function parseApiError(err: any): string {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail.map((e: any) => e.msg).join(', ')
  }
  if (typeof detail === 'string') return detail
  return err?.message || 'An error occurred'
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
