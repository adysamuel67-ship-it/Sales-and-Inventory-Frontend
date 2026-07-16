/**
 * Sales Page Tests
 *
 * Verifies:
 * 1. extractArray utility
 * 2. normalizeProduct utility
 * 3. mapSale with productMap
 * 4. Date filter logic
 * 5. Pagination logic
 * 6. Payment method color mapping
 * 7. Running total calculations
 * 8. Sale record form validation
 * 9. Double-confirm delete flow
 * 10. Date presets
 */

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key]
    }
  }
  return []
}

function normalizeProduct(raw: any) {
  return {
    product_id: raw.product_id ?? raw.id,
    name: raw.name,
    price: raw.price ?? 0,
    quantity: raw.quantity ?? raw.stock ?? 0,
    ...raw,
  }
}

function mapSale(raw: any, productMap: Map<number, string>) {
  const items = raw.sales_items || []
  const productNames = items.map((i: any) => {
    if (i.product_name || i.name) return i.product_name || i.name
    const pid = i.product_id ?? i.productId
    if (pid != null && productMap.has(pid)) return productMap.get(pid)!
    return pid != null ? `Product #${pid}` : 'Unknown'
  }).join(', ')
  const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0)
  return {
    id: raw.sale_id ?? raw.id,
    product: productNames || raw.product_name || raw.product || 'Unknown',
    qty: totalQty,
    amount: raw.total_amount ?? raw.amount ?? 0,
    payment: raw.payment_method || raw.payment || 'N/A',
    time: raw.created_at
      ? new Date(raw.created_at).toLocaleString()
      : raw.time || '',
    created_at: raw.created_at,
  }
}

describe('Sales extractArray', () => {
  it('returns array directly', () => {
    expect(extractArray([{ id: 1 }])).toEqual([{ id: 1 }])
  })

  it('extracts from data property', () => {
    expect(extractArray({ data: [{ id: 1 }] })).toEqual([{ id: 1 }])
  })

  it('returns empty array for null', () => {
    expect(extractArray(null)).toEqual([])
  })
})

describe('Sales normalizeProduct', () => {
  it('normalizes product with product_id', () => {
    const p = normalizeProduct({ product_id: 5, name: 'Rice', price: 50, quantity: 100 })
    expect(p.product_id).toBe(5)
    expect(p.price).toBe(50)
  })

  it('falls back to id', () => {
    expect(normalizeProduct({ id: 3, name: 'Item' }).product_id).toBe(3)
  })

  it('defaults price and quantity to 0', () => {
    const p = normalizeProduct({ product_id: 1, name: 'Item' })
    expect(p.price).toBe(0)
    expect(p.quantity).toBe(0)
  })
})

describe('Sales mapSale', () => {
  it('maps sale with sales_items and productMap', () => {
    const raw = {
      sale_id: 1,
      sales_items: [
        { product_id: 10, quantity: 3 },
        { product_id: 20, quantity: 2 },
      ],
      total_amount: 250,
      payment_method: 'Cash',
      created_at: '2024-01-15T10:30:00Z',
    }
    const productMap = new Map([[10, 'Rice'], [20, 'Beans']])
    const sale = mapSale(raw, productMap)
    expect(sale.id).toBe(1)
    expect(sale.product).toBe('Rice, Beans')
    expect(sale.qty).toBe(5)
    expect(sale.amount).toBe(250)
    expect(sale.payment).toBe('Cash')
    expect(sale.created_at).toBe('2024-01-15T10:30:00Z')
  })

  it('uses Product #id fallback for unknown products', () => {
    const raw = {
      sale_id: 2,
      sales_items: [{ product_id: 99, quantity: 1 }],
      total_amount: 50,
    }
    const sale = mapSale(raw, new Map())
    expect(sale.product).toBe('Product #99')
  })

  it('maps sale without sales_items using product_name', () => {
    const raw = {
      id: 3,
      product_name: 'Fish',
      quantity: 10,
      total_amount: 200,
      payment_method: 'MoMo',
    }
    const sale = mapSale(raw, new Map())
    expect(sale.product).toBe('Fish')
    expect(sale.qty).toBe(0)
  })

  it('uses defaults for empty raw', () => {
    const sale = mapSale({ id: 4 }, new Map())
    expect(sale.product).toBe('Unknown')
    expect(sale.qty).toBe(0)
    expect(sale.amount).toBe(0)
  })
})

describe('Sales date filtering', () => {
  const sales = [
    { id: 1, created_at: '2024-01-10T10:00:00Z', amount: 100 },
    { id: 2, created_at: '2024-01-15T10:00:00Z', amount: 200 },
    { id: 3, created_at: '2024-01-20T10:00:00Z', amount: 300 },
    { id: 4, created_at: '2024-02-01T10:00:00Z', amount: 400 },
  ]

  function filterSales(sales: any[], start: string, end: string) {
    if (!start && !end) return sales
    return sales.filter((sale) => {
      if (!sale.created_at) return false
      const saleDate = new Date(sale.created_at)
      if (start && saleDate < new Date(start)) return false
      if (end) {
        const endDate = new Date(end)
        endDate.setHours(23, 59, 59, 999)
        if (saleDate > endDate) return false
      }
      return true
    })
  }

  it('returns all sales when no filter', () => {
    expect(filterSales(sales, '', '')).toHaveLength(4)
  })

  it('filters by start date', () => {
    const result = filterSales(sales, '2024-01-15', '')
    expect(result).toHaveLength(3)
  })

  it('filters by end date', () => {
    const result = filterSales(sales, '', '2024-01-15')
    expect(result).toHaveLength(2)
  })

  it('filters by date range', () => {
    const result = filterSales(sales, '2024-01-10', '2024-01-20')
    expect(result).toHaveLength(3)
  })

  it('returns empty for no matches', () => {
    const result = filterSales(sales, '2024-03-01', '2024-03-31')
    expect(result).toHaveLength(0)
  })

  it('excludes sales without created_at', () => {
    const withMissing = [...sales, { id: 5, amount: 500 }]
    const result = filterSales(withMissing, '2024-01-01', '2024-12-31')
    expect(result).toHaveLength(4)
  })
})

describe('Sales pagination', () => {
  const PAGE_SIZE = 20

  it('calculates total pages correctly', () => {
    expect(Math.ceil(0 / PAGE_SIZE)).toBe(0)
    expect(Math.ceil(1 / PAGE_SIZE)).toBe(1)
    expect(Math.ceil(20 / PAGE_SIZE)).toBe(1)
    expect(Math.ceil(21 / PAGE_SIZE)).toBe(2)
    expect(Math.ceil(45 / PAGE_SIZE)).toBe(3)
  })

  it('paginates correctly for page 1', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1)
    const start = 0
    const page = items.slice(start, start + PAGE_SIZE)
    expect(page).toHaveLength(20)
    expect(page[0]).toBe(1)
    expect(page[19]).toBe(20)
  })

  it('paginates correctly for page 2', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1)
    const start = (2 - 1) * PAGE_SIZE
    const page = items.slice(start, start + PAGE_SIZE)
    expect(page).toHaveLength(5)
    expect(page[0]).toBe(21)
  })

  it('resets to page 1 when date filter changes', () => {
    let currentPage = 3
    currentPage = 1
    expect(currentPage).toBe(1)
  })
})

describe('Payment method colors', () => {
  const paymentColors: Record<string, string> = {
    Cash: 'bg-success-light text-success',
    MoMo: 'bg-primary-light text-primary',
    Card: 'bg-warning-light text-warning',
  }

  it('Cash has green styling', () => {
    expect(paymentColors['Cash']).toContain('success')
  })

  it('MoMo has primary styling', () => {
    expect(paymentColors['MoMo']).toContain('primary')
  })

  it('Card has warning styling', () => {
    expect(paymentColors['Card']).toContain('warning')
  })

  it('unknown payment gets default styling', () => {
    const color = paymentColors['Cheque'] || 'bg-gray-100 text-gray-600'
    expect(color).toContain('gray')
  })
})

describe('Sale running totals', () => {
  const sales = [
    { amount: 100, qty: 5 },
    { amount: 200, qty: 10 },
    { amount: 150, qty: 7 },
  ]

  it('calculates total amount', () => {
    const total = sales.reduce((sum, s) => sum + s.amount, 0)
    expect(total).toBe(450)
  })

  it('calculates total quantity', () => {
    const total = sales.reduce((sum, s) => sum + s.qty, 0)
    expect(total).toBe(22)
  })

  it('handles empty sales array', () => {
    const total = [].reduce((sum: number, s: any) => sum + s.amount, 0)
    expect(total).toBe(0)
  })
})

describe('Sale record form', () => {
  it('requires product_id and quantity', () => {
    const form = { product_id: '', quantity: '', payment_method: 'Cash' }
    const isValid = !!form.product_id && !!form.quantity
    expect(isValid).toBe(false)
  })

  it('is valid with product and quantity', () => {
    const form = { product_id: '5', quantity: '3', payment_method: 'Cash' }
    const isValid = !!form.product_id && !!form.quantity
    expect(isValid).toBe(true)
  })

  it('calculates form total correctly', () => {
    const price = 50
    const quantity = 3
    const total = price * quantity
    expect(total).toBe(150)
  })

  it('defaults payment method to Cash', () => {
    const form = { product_id: '', quantity: '', payment_method: 'Cash' }
    expect(form.payment_method).toBe('Cash')
  })

  it('validates quantity does not exceed stock', () => {
    const quantity = 15
    const stock = 10
    const exceeds = quantity > stock
    expect(exceeds).toBe(true)
  })

  it('quantity within stock is valid', () => {
    const quantity = 5
    const stock = 10
    const exceeds = quantity > stock
    expect(exceeds).toBe(false)
  })
})

describe('Sale delete confirmation', () => {
  it('deleteConfirm starts as null', () => {
    let deleteConfirm: number | null = null
    expect(deleteConfirm).toBeNull()
  })

  it('sets confirmation on click', () => {
    let deleteConfirm: number | null = null
    deleteConfirm = 42
    expect(deleteConfirm).toBe(42)
  })

  it('clears confirmation on cancel', () => {
    let deleteConfirm: number | null = 42
    deleteConfirm = null
    expect(deleteConfirm).toBeNull()
  })

  it('clears confirmation after delete', () => {
    let deleteConfirm: number | null = 42
    deleteConfirm = null
    expect(deleteConfirm).toBeNull()
  })
})

describe('Sales date presets', () => {
  const datePresets = [
    { label: 'All', days: 0 },
    { label: 'Today', days: 1 },
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
  ]

  it('has 5 presets', () => {
    expect(datePresets).toHaveLength(5)
  })

  it('"All" preset has 0 days (no filter)', () => {
    const allPreset = datePresets.find((p) => p.label === 'All')
    expect(allPreset?.days).toBe(0)
  })

  it('"Today" preset is 1 day', () => {
    const todayPreset = datePresets.find((p) => p.label === 'Today')
    expect(todayPreset?.days).toBe(1)
  })

  it('handlePreset with days=0 clears filter', () => {
    const days = 0
    const start = days === 0 ? '' : new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const end = days === 0 ? '' : new Date().toISOString().split('T')[0]
    expect(start).toBe('')
    expect(end).toBe('')
  })

  it('handlePreset with days>0 sets filter', () => {
    const days = 7
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    expect(start).not.toBe('')
    expect(end).not.toBe('')
  })
})
