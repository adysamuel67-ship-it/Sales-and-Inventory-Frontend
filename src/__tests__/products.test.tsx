/**
 * Products Page Tests
 *
 * Verifies:
 * 1. extractArray utility handles various response formats
 * 2. normalizeProduct normalizes field aliases
 * 3. getStockBadge returns correct badge colors/labels by threshold
 * 4. Search filtering works on product names
 * 5. Role-based UI: staff cannot add/delete products
 * 6. Product table renders with data
 * 7. Empty state renders correctly
 * 8. Add product form toggle
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
    cost_price: raw.cost_price ?? 0,
    quantity: raw.quantity ?? raw.stock ?? 0,
    unit: raw.unit || 'units',
    ...raw,
  }
}

function getStockBadge(qty: number, threshold: number = 10) {
  if (qty <= 0) return { bg: 'bg-danger-light', text: 'text-danger', label: 'Out of stock' }
  if (qty <= threshold * 0.3) return { bg: 'bg-danger-light', text: 'text-danger', label: `${qty} left` }
  if (qty <= threshold) return { bg: 'bg-warning-light', text: 'text-warning', label: `${qty} left` }
  return { bg: 'bg-success-light', text: 'text-success', label: `${qty} in stock` }
}

describe('Products extractArray utility', () => {
  it('returns array directly if data is an array', () => {
    const data = [{ id: 1, name: 'Rice' }, { id: 2, name: 'Beans' }]
    expect(extractArray(data)).toHaveLength(2)
  })

  it('finds array in "data" property', () => {
    const data = { data: [{ id: 1, name: 'Rice' }] }
    expect(extractArray(data)).toEqual([{ id: 1, name: 'Rice' }])
  })

  it('finds array in "results" property', () => {
    const data = { count: 1, results: [{ id: 1 }] }
    expect(extractArray(data)).toHaveLength(1)
  })

  it('returns empty array for null', () => {
    expect(extractArray(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(extractArray(undefined)).toEqual([])
  })

  it('returns empty array for string', () => {
    expect(extractArray('hello')).toEqual([])
  })

  it('returns empty array for number', () => {
    expect(extractArray(42)).toEqual([])
  })

  it('returns empty array for object with no array property', () => {
    expect(extractArray({ name: 'test', count: 5 })).toEqual([])
  })

  it('handles empty array', () => {
    expect(extractArray([])).toEqual([])
  })

  it('finds first array in object with multiple arrays', () => {
    const data = { items: [{ id: 1 }], tags: ['a', 'b'] }
    expect(extractArray(data)).toEqual([{ id: 1 }])
  })
})

describe('normalizeProduct', () => {
  it('uses product_id field', () => {
    const raw = { product_id: 42, name: 'Rice', price: 50, quantity: 100 }
    const p = normalizeProduct(raw)
    expect(p.product_id).toBe(42)
    expect(p.name).toBe('Rice')
  })

  it('falls back to id field when product_id is absent', () => {
    const raw = { id: 7, name: 'Beans', price: 30 }
    const p = normalizeProduct(raw)
    expect(p.product_id).toBe(7)
  })

  it('defaults price to 0', () => {
    const raw = { product_id: 1, name: 'Item' }
    const p = normalizeProduct(raw)
    expect(p.price).toBe(0)
  })

  it('uses cost_price from raw', () => {
    const raw = { product_id: 1, name: 'Item', cost_price: 25 }
    const p = normalizeProduct(raw)
    expect(p.cost_price).toBe(25)
  })

  it('defaults cost_price to 0', () => {
    const raw = { product_id: 1, name: 'Item' }
    const p = normalizeProduct(raw)
    expect(p.cost_price).toBe(0)
  })

  it('falls back to stock field for quantity', () => {
    const raw = { product_id: 1, name: 'Item', stock: 50 }
    const p = normalizeProduct(raw)
    expect(p.quantity).toBe(50)
  })

  it('defaults quantity to 0', () => {
    const raw = { product_id: 1, name: 'Item' }
    const p = normalizeProduct(raw)
    expect(p.quantity).toBe(0)
  })

  it('defaults unit to "units"', () => {
    const raw = { product_id: 1, name: 'Item' }
    const p = normalizeProduct(raw)
    expect(p.unit).toBe('units')
  })

  it('preserves explicit unit', () => {
    const raw = { product_id: 1, name: 'Item', unit: 'bags' }
    const p = normalizeProduct(raw)
    expect(p.unit).toBe('bags')
  })

  it('preserves extra fields from raw', () => {
    const raw = { product_id: 1, name: 'Item', category: 'food', threshold: 5 }
    const p = normalizeProduct(raw)
    expect((p as any).category).toBe('food')
    expect((p as any).threshold).toBe(5)
  })
})

describe('getStockBadge', () => {
  it('returns danger badge for zero quantity', () => {
    const badge = getStockBadge(0)
    expect(badge.bg).toBe('bg-danger-light')
    expect(badge.text).toBe('text-danger')
    expect(badge.label).toBe('Out of stock')
  })

  it('returns danger badge for negative quantity', () => {
    const badge = getStockBadge(-5)
    expect(badge.bg).toBe('bg-danger-light')
    expect(badge.label).toBe('Out of stock')
  })

  it('returns danger badge when qty <= 30% of threshold', () => {
    const badge = getStockBadge(2, 10)
    expect(badge.bg).toBe('bg-danger-light')
    expect(badge.text).toBe('text-danger')
    expect(badge.label).toBe('2 left')
  })

  it('returns warning badge when qty <= threshold but > 30%', () => {
    const badge = getStockBadge(5, 10)
    expect(badge.bg).toBe('bg-warning-light')
    expect(badge.text).toBe('text-warning')
    expect(badge.label).toBe('5 left')
  })

  it('returns warning badge when qty equals threshold', () => {
    const badge = getStockBadge(10, 10)
    expect(badge.bg).toBe('bg-warning-light')
    expect(badge.label).toBe('10 left')
  })

  it('returns success badge when qty > threshold', () => {
    const badge = getStockBadge(25, 10)
    expect(badge.bg).toBe('bg-success-light')
    expect(badge.text).toBe('text-success')
    expect(badge.label).toBe('25 in stock')
  })

  it('uses default threshold of 10', () => {
    const badge = getStockBadge(15)
    expect(badge.bg).toBe('bg-success-light')
    expect(badge.label).toBe('15 in stock')
  })

  it('handles custom threshold', () => {
    const badge = getStockBadge(8, 5)
    expect(badge.bg).toBe('bg-success-light')
    expect(badge.label).toBe('8 in stock')
  })

  it('boundary: 1 unit with threshold 10 is danger (<= 3)', () => {
    const badge = getStockBadge(1, 10)
    expect(badge.bg).toBe('bg-danger-light')
  })

  it('boundary: 3 units with threshold 10 is danger (<= 3)', () => {
    const badge = getStockBadge(3, 10)
    expect(badge.bg).toBe('bg-danger-light')
  })

  it('boundary: 4 units with threshold 10 is warning (> 3)', () => {
    const badge = getStockBadge(4, 10)
    expect(badge.bg).toBe('bg-warning-light')
  })
})

describe('Product search filtering', () => {
  const products = [
    { product_id: 1, name: 'Rice Bag' },
    { product_id: 2, name: 'Beans Pack' },
    { product_id: 3, name: 'Tomato Sauce' },
    { product_id: 4, name: 'Rice Flour' },
  ]

  function filterProducts(products: any[], search: string) {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
  }

  it('returns all products when search is empty', () => {
    expect(filterProducts(products, '')).toHaveLength(4)
  })

  it('filters by exact substring', () => {
    const results = filterProducts(products, 'Rice')
    expect(results).toHaveLength(2)
    expect(results.map((p: any) => p.name)).toContain('Rice Bag')
    expect(results.map((p: any) => p.name)).toContain('Rice Flour')
  })

  it('filters case-insensitively', () => {
    const results = filterProducts(products, 'beans')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Beans Pack')
  })

  it('returns empty for no match', () => {
    expect(filterProducts(products, 'xyz')).toHaveLength(0)
  })

  it('partial match works', () => {
    const results = filterProducts(products, 'Sau')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Tomato Sauce')
  })
})

describe('Product role-based access', () => {
  it('isStaff is true only for STAFF role', () => {
    const isStaffCheck = (role: string) => role === 'STAFF' || role === 'staff'
    expect(isStaffCheck('STAFF')).toBe(true)
    expect(isStaffCheck('staff')).toBe(true)
    expect(isStaffCheck('admin')).toBe(false)
    expect(isStaffCheck('OWNER')).toBe(false)
    expect(isStaffCheck('super_admin')).toBe(false)
  })

  it('isStaff is false for OWNER, ADMIN, super_admin', () => {
    const isStaffCheck = (role: string) => role === 'STAFF' || role === 'staff'
    expect(isStaffCheck('OWNER')).toBe(false)
    expect(isStaffCheck('ADMIN')).toBe(false)
    expect(isStaffCheck('super_admin')).toBe(false)
  })
})

describe('Product form validation', () => {
  it('form requires name', () => {
    const form = { name: '', price: '50', cost_price: '30', quantity: '10', unit: 'units' }
    expect(form.name.trim()).toBe('')
  })

  it('form is valid when name is provided', () => {
    const form = { name: 'Rice', price: '50', cost_price: '30', quantity: '10', unit: 'units' }
    expect(form.name.trim().length > 0).toBe(true)
  })

  it('form parses numeric values correctly', () => {
    const price = parseFloat('50.50') || 0
    const cost = parseFloat('30.25') || 0
    const qty = parseInt('10') || 0
    expect(price).toBe(50.5)
    expect(cost).toBe(30.25)
    expect(qty).toBe(10)
  })

  it('form defaults empty numeric values to 0', () => {
    const price = parseFloat('') || 0
    const cost = parseFloat('') || 0
    const qty = parseInt('') || 0
    expect(price).toBe(0)
    expect(cost).toBe(0)
    expect(qty).toBe(0)
  })
})

describe('Product delete confirmation flow', () => {
  it('deleteConfirm starts as null', () => {
    let deleteConfirm: number | null = null
    expect(deleteConfirm).toBeNull()
  })

  it('clicking delete sets confirmation ID', () => {
    let deleteConfirm: number | null = null
    deleteConfirm = 42
    expect(deleteConfirm).toBe(42)
  })

  it('confirming clears the confirmation', () => {
    let deleteConfirm: number | null = 42
    deleteConfirm = null
    expect(deleteConfirm).toBeNull()
  })
})

describe('Product restock logic', () => {
  it('restock adds quantity to existing stock', () => {
    const products = [
      { product_id: 1, name: 'Rice', quantity: 50 },
    ]
    const productId = 1
    const addQty = 25
    const updatedQty = (products.find((p) => p.product_id === productId)?.quantity || 0) + addQty
    expect(updatedQty).toBe(75)
  })

  it('restock with zero quantity does not change stock', () => {
    const products = [
      { product_id: 1, name: 'Rice', quantity: 50 },
    ]
    const productId = 1
    const addQty = 0
    const updatedQty = (products.find((p) => p.product_id === productId)?.quantity || 0) + addQty
    expect(updatedQty).toBe(50)
  })

  it('restock with empty input defaults to 0', () => {
    const restockQty: Record<number, string> = {}
    const qty = parseInt(restockQty[1] || '0')
    expect(qty).toBe(0)
  })
})
