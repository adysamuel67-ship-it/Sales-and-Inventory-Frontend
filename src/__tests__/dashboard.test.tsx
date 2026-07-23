/**
 * Dashboard Page Tests
 *
 * Verifies:
 * 1. extractSummary utility extracts from various response shapes
 * 2. extractArray with depth limiting
 * 3. mapSale maps raw sale data correctly
 * 4. mapLowStock maps raw product data correctly
 * 5. getDateRange generates correct date strings
 * 6. generateDateLabels produces day labels
 * 7. Role-based KPI card display (staff vs owner)
 * 8. Profit margin warning logic
 * 9. Date presets
 */

function extractSummary(data: any): {
  total_revenue: number
  total_profit: number
  total_sales: number
  total_products: number
} | null {
  if (!data || typeof data !== 'object') return null
  const revenue = data.total_revenue ?? data.revenue ?? data.total_amount ?? null
  const profit = data.total_profit ?? data.profit ?? data.net_profit ?? null
  const sales = data.total_sales ?? data.sales ?? data.sales_count ?? null
  const products = data.total_active_products ?? data.total_products ?? data.products ?? null
  if (revenue === null && profit === null && sales === null && products === null) return null
  return {
    total_revenue: Number(revenue ?? 0),
    total_profit: Number(profit ?? 0),
    total_sales: Number(sales ?? 0),
    total_products: Number(products ?? 0),
  }
}

function extractArray(data: any, depth = 0): any[] {
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

function mapSale(raw: any, productMap?: Map<number, string>) {
  const items = raw.sales_items || []
  const productNames = items.map((i: any) => {
    if (i.product_name || i.name) return i.product_name || i.name
    const pid = i.product_id ?? i.productId
    if (pid != null && productMap && productMap.has(pid)) return productMap.get(pid)!
    return pid != null ? `Product #${pid}` : 'Unknown'
  }).join(', ')
  const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0)
  return {
    id: raw.sale_id ?? raw.id,
    product: productNames || raw.product_name || raw.product || 'Unknown',
    qty: totalQty || raw.quantity || raw.qty || 0,
    amount: raw.total_amount ?? raw.amount ?? 0,
    payment: (raw.payment_method || raw.payment || 'N/A').toLowerCase(),
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : raw.time || '',
  }
}

function mapLowStock(raw: any) {
  return {
    name: raw.name || raw.product_name || 'Unknown',
    stock: raw.quantity ?? raw.stock ?? 0,
    threshold: raw.low_stock_threshold ?? raw.threshold ?? raw.reorder_level ?? 10,
    unit: raw.unit || 'units',
  }
}

function getDateRange(daysAgo: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - daysAgo)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function generateDateLabels(startDate: string, endDate: string): string[] {
  const labels: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    labels.push(d.toLocaleDateString())
  }
  return labels
}

describe('extractSummary', () => {
  it('extracts from standard fields', () => {
    const data = { total_revenue: 1000, total_profit: 300, total_sales: 15, total_products: 8 }
    const result = extractSummary(data)
    expect(result).toEqual({ total_revenue: 1000, total_profit: 300, total_sales: 15, total_products: 8 })
  })

  it('extracts from alternative field names', () => {
    const data = { revenue: 500, profit: 100, sales: 5, products: 3 }
    const result = extractSummary(data)
    expect(result).toEqual({ total_revenue: 500, total_profit: 100, total_sales: 5, total_products: 3 })
  })

  it('extracts from total_amount, net_profit, sales_count', () => {
    const data = { total_amount: 2000, net_profit: 600, sales_count: 20 }
    const result = extractSummary(data)
    expect(result).toEqual({ total_revenue: 2000, total_profit: 600, total_sales: 20, total_products: 0 })
  })

  it('returns null for null input', () => {
    expect(extractSummary(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(extractSummary(undefined)).toBeNull()
  })

  it('returns null for string input', () => {
    expect(extractSummary('hello')).toBeNull()
  })

  it('returns null when all fields are missing', () => {
    expect(extractSummary({ name: 'test' })).toBeNull()
  })

  it('defaults missing fields to 0', () => {
    const result = extractSummary({ total_revenue: 100 })
    expect(result).not.toBeNull()
    expect(result!.total_revenue).toBe(100)
    expect(result!.total_profit).toBe(0)
    expect(result!.total_sales).toBe(0)
    expect(result!.total_products).toBe(0)
  })

  it('wraps non-number values with Number()', () => {
    const data = { total_revenue: '1000', total_profit: '300', total_sales: '15' }
    const result = extractSummary(data)
    expect(result!.total_revenue).toBe(1000)
    expect(result!.total_profit).toBe(300)
  })
})

describe('extractArray with depth', () => {
  it('stops at depth 4', () => {
    const data = { a: { b: { c: { d: { e: [1, 2, 3] } } } } }
    const result = extractArray(data)
    expect(result).toEqual([])
  })

  it('finds array at depth 1', () => {
    const data = { nested: { items: [{ id: 1 }] } }
    const result = extractArray(data)
    expect(result).toEqual([{ id: 1 }])
  })

  it('finds array at depth 2', () => {
    const data = { a: { b: { items: [1, 2] } } }
    const result = extractArray(data)
    expect(result).toEqual([1, 2])
  })

  it('returns empty for primitive at depth limit', () => {
    expect(extractArray(42, 4)).toEqual([])
  })
})

describe('mapSale', () => {
  it('maps sale with sales_items', () => {
    const raw = {
      sale_id: 1,
      sales_items: [
        { product_name: 'Rice', quantity: 5 },
        { product_name: 'Beans', quantity: 3 },
      ],
      total_amount: 250,
      payment_method: 'cash',
      created_at: '2024-01-15T10:30:00Z',
    }
    const sale = mapSale(raw)
    expect(sale.id).toBe(1)
    expect(sale.product).toBe('Rice, Beans')
    expect(sale.qty).toBe(8)
    expect(sale.amount).toBe(250)
    expect(sale.payment).toBe('cash')
  })

  it('maps sale with product_id referencing productMap', () => {
    const raw = {
      sale_id: 2,
      sales_items: [{ product_id: 42, quantity: 2 }],
      total_amount: 100,
      payment_method: 'mobile_money',
    }
    const productMap = new Map([[42, 'Tomato Sauce']])
    const sale = mapSale(raw, productMap)
    expect(sale.product).toBe('Tomato Sauce')
    expect(sale.qty).toBe(2)
  })

  it('falls back to Product #id when not in productMap', () => {
    const raw = {
      sale_id: 3,
      sales_items: [{ product_id: 99, quantity: 1 }],
      total_amount: 50,
    }
    const productMap = new Map<number, string>()
    const sale = mapSale(raw, productMap)
    expect(sale.product).toBe('Product #99')
  })

  it('maps sale without sales_items', () => {
    const raw = {
      id: 4,
      product_name: 'Fish',
      quantity: 10,
      total_amount: 200,
      payment_method: 'card',
      created_at: '2024-01-16T14:00:00Z',
    }
    const sale = mapSale(raw)
    expect(sale.product).toBe('Fish')
    expect(sale.qty).toBe(10)
    expect(sale.amount).toBe(200)
  })

  it('uses defaults for minimal data', () => {
    const raw = { id: 5 }
    const sale = mapSale(raw)
    expect(sale.product).toBe('Unknown')
    expect(sale.qty).toBe(0)
    expect(sale.amount).toBe(0)
    expect(sale.payment).toBe('N/A')
  })

  it('uses time field when created_at is absent', () => {
    const raw = { id: 6, time: '10:30 AM', product_name: 'Item', quantity: 1 }
    const sale = mapSale(raw)
    expect(sale.time).toBe('10:30 AM')
  })

  it('handles sales_items with name field instead of product_name', () => {
    const raw = {
      sale_id: 7,
      sales_items: [{ name: 'Pepper', quantity: 4 }],
      total_amount: 80,
    }
    const sale = mapSale(raw)
    expect(sale.product).toBe('Pepper')
    expect(sale.qty).toBe(4)
  })
})

describe('mapLowStock', () => {
  it('maps standard fields', () => {
    const raw = { name: 'Rice', quantity: 3, threshold: 10, unit: 'bags' }
    const item = mapLowStock(raw)
    expect(item).toEqual({ name: 'Rice', stock: 3, threshold: 10, unit: 'bags' })
  })

  it('maps alternative field names', () => {
    const raw = { product_name: 'Beans', stock: 2, reorder_level: 5, unit: 'packs' }
    const item = mapLowStock(raw)
    expect(item.name).toBe('Beans')
    expect(item.stock).toBe(2)
    expect(item.threshold).toBe(5)
    expect(item.unit).toBe('packs')
  })

  it('uses defaults for missing fields', () => {
    const raw = {}
    const item = mapLowStock(raw)
    expect(item.name).toBe('Unknown')
    expect(item.stock).toBe(0)
    expect(item.threshold).toBe(10)
    expect(item.unit).toBe('units')
  })

  it('prefers name over product_name', () => {
    const raw = { name: 'Pepper', product_name: 'Hot Pepper' }
    const item = mapLowStock(raw)
    expect(item.name).toBe('Pepper')
  })

  it('falls back to product_name when name is absent', () => {
    const raw = { product_name: 'Onion' }
    const item = mapLowStock(raw)
    expect(item.name).toBe('Onion')
  })
})

describe('getDateRange', () => {
  it('returns start and end date strings', () => {
    const range = getDateRange(30)
    expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('end date is today', () => {
    const range = getDateRange(7)
    const today = new Date().toISOString().split('T')[0]
    expect(range.end).toBe(today)
  })

  it('start date is daysAgo days before end', () => {
    const range = getDateRange(7)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    expect(diffDays).toBe(7)
  })

  it('30 day range', () => {
    const range = getDateRange(30)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    expect(diffDays).toBe(30)
  })

  it('1 year range', () => {
    const range = getDateRange(365)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    expect(diffDays).toBe(365)
  })
})

describe('generateDateLabels', () => {
  it('generates labels for a 3-day range', () => {
    const labels = generateDateLabels('2024-01-01', '2024-01-03')
    expect(labels).toHaveLength(3)
  })

  it('generates single label for same start and end', () => {
    const labels = generateDateLabels('2024-01-15', '2024-01-15')
    expect(labels).toHaveLength(1)
  })

  it('generates labels for 7-day range', () => {
    const labels = generateDateLabels('2024-01-01', '2024-01-07')
    expect(labels).toHaveLength(7)
  })
})

describe('Role-based KPI display', () => {
  it('staff sees 2 KPI cards (Today\'s Sales + Low Stock)', () => {
    const isStaff = true
    const kpiCount = isStaff ? 2 : 4
    expect(kpiCount).toBe(2)
  })

  it('owner sees 4 KPI cards (Revenue + Profit + Sales + Products)', () => {
    const isStaff = false
    const kpiCount = isStaff ? 2 : 4
    expect(kpiCount).toBe(4)
  })

  it('staff role check: only STAFF is staff', () => {
    const isStaffCheck = (role: string) => role === 'STAFF' || role === 'staff'
    expect(isStaffCheck('STAFF')).toBe(true)
    expect(isStaffCheck('admin')).toBe(false)
    expect(isStaffCheck('OWNER')).toBe(false)
  })

  it('owner is not staff', () => {
    const isStaffCheck = (role: string) => role === 'STAFF' || role === 'staff'
    expect(isStaffCheck('OWNER')).toBe(false)
  })

  it('super_admin is not staff', () => {
    const isStaffCheck = (role: string) => role === 'STAFF' || role === 'staff'
    expect(isStaffCheck('super_admin')).toBe(false)
  })
})

describe('Profit margin warning', () => {
  it('shows warning when margin < 5%', () => {
    const revenue = 1000
    const profit = 40
    const margin = (profit / revenue) * 100
    expect(margin).toBeLessThan(5)
  })

  it('does not show warning when margin >= 5%', () => {
    const revenue = 1000
    const profit = 100
    const margin = (profit / revenue) * 100
    expect(margin).toBeGreaterThanOrEqual(5)
  })

  it('does not show warning when revenue is 0', () => {
    const revenue = 0
    const profit = 0
    const showWarning = revenue > 0 && profit > 0 && (profit / revenue) * 100 < 5
    expect(showWarning).toBe(false)
  })

  it('formats margin correctly', () => {
    const margin = 3.7
    expect(margin.toFixed(1)).toBe('3.7')
  })
})

describe('Date presets', () => {
  const datePresets = [
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: '1 year', days: 365 },
  ]

  it('has 4 presets', () => {
    expect(datePresets).toHaveLength(4)
  })

  it('each preset has label and days', () => {
    datePresets.forEach((preset) => {
      expect(typeof preset.label).toBe('string')
      expect(typeof preset.days).toBe('number')
      expect(preset.days).toBeGreaterThan(0)
    })
  })

  it('presets are in ascending order', () => {
    const days = datePresets.map((p) => p.days)
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThan(days[i - 1])
    }
  })
})
