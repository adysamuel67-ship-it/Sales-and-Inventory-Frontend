import {
  formatPayment,
  extractArray,
  mapSale,
  mapLowStock,
  normalizeProduct,
  extractSummary,
  extractProfit,
  getDateRange,
  generateDateLabels,
  parseApiError,
  isSuperAdminUser,
  isAdminRole,
  isManagerRole,
  isStaffRole,
  isPlatformAdmin,
  SUPER_ADMIN_EMAIL,
} from '../lib/utils'

describe('formatPayment', () => {
  it('formats cash', () => expect(formatPayment('cash')).toBe('Cash'))
  it('formats mobile_money', () => expect(formatPayment('mobile_money')).toBe('MoMo'))
  it('formats card', () => expect(formatPayment('card')).toBe('Card'))
  it('returns original for unknown', () => expect(formatPayment('bitcoin')).toBe('bitcoin'))
  it('handles empty string', () => expect(formatPayment('')).toBe(''))
  it('handles null/undefined', () => expect(formatPayment(null as any)).toBe(null))
  it('is case insensitive', () => expect(formatPayment('CASH')).toBe('Cash'))
})

describe('extractArray', () => {
  it('returns array directly', () => {
    expect(extractArray([1, 2, 3])).toEqual([1, 2, 3])
  })
  it('extracts from object with array key', () => {
    expect(extractArray({ data: [1, 2] })).toEqual([1, 2])
  })
  it('extracts from nested object', () => {
    expect(extractArray({ a: { b: [1, 2, 3] } })).toEqual([1, 2, 3])
  })
  it('returns empty for null', () => expect(extractArray(null)).toEqual([]))
  it('returns empty for undefined', () => expect(extractArray(undefined)).toEqual([]))
  it('returns empty for non-object non-array', () => expect(extractArray('string')).toEqual([]))
  it('returns empty for number', () => expect(extractArray(42)).toEqual([]))
  it('returns empty for deeply nested with no array', () => {
    expect(extractArray({ a: { b: { c: 'd' } } })).toEqual([])
  })
  it('returns empty when depth exceeded', () => {
    expect(extractArray({ a: { b: { c: { d: { e: [1] } } } } })).toEqual([])
  })
})

describe('mapSale', () => {
  it('maps basic sale data', () => {
    const raw = {
      sale_id: 1,
      total_amount: 100,
      payment_method: 'cash',
      created_at: '2024-01-15T10:00:00Z',
      sales_items: [
        { product_name: 'Widget', quantity: 5 },
      ],
    }
    const result = mapSale(raw)
    expect(result.id).toBe(1)
    expect(result.amount).toBe(100)
    expect(result.payment).toBe('cash')
    expect(result.product).toBe('Widget')
    expect(result.qty).toBe(5)
    expect(result.time).toBeTruthy()
  })

  it('uses productMap when product_name missing', () => {
    const raw = { sale_id: 2, sales_items: [{ product_id: 10, quantity: 3 }] }
    const productMap = new Map([[10, 'Gadget']])
    const result = mapSale(raw, productMap)
    expect(result.product).toBe('Gadget')
    expect(result.qty).toBe(3)
  })

  it('uses userMap for sold_by_name', () => {
    const raw = { sale_id: 3, user_id: 5, sales_items: [] }
    const userMap = new Map([[5, 'Alice']])
    const result = mapSale(raw, undefined, userMap)
    expect(result.sold_by_name).toBe('Alice')
    expect(result.user_id).toBe(5)
  })

  it('handles missing fields gracefully', () => {
    const result = mapSale({})
    expect(result.id).toBeUndefined()
    expect(result.product).toBe('Unknown')
    expect(result.qty).toBe(0)
    expect(result.amount).toBe(0)
  })

  it('maps customer fields', () => {
    const raw = {
      sales_items: [],
      customer_id: 1,
      customer_name: 'Bob',
      customer_phone: '123456',
      customer_email: 'bob@test.com',
    }
    const result = mapSale(raw)
    expect(result.customer_id).toBe(1)
    expect(result.customer_name).toBe('Bob')
    expect(result.customer_phone).toBe('123456')
    expect(result.customer_email).toBe('bob@test.com')
  })

  it('maps amount_paid and payment_status', () => {
    const raw = { sales_items: [], amount_paid: 50, payment_status: 'partial' }
    const result = mapSale(raw)
    expect(result.amount_paid).toBe(50)
    expect(result.payment_status).toBe('partial')
  })

  it('maps note', () => {
    const raw = { sales_items: [], note: 'Rush order' }
    const result = mapSale(raw)
    expect(result.note).toBe('Rush order')
  })

  it('resolves product from nested customer object', () => {
    const raw = {
      sales_items: [],
      customer: { name: 'Eve', phone: '999' },
    }
    const result = mapSale(raw)
    expect(result.customer_name).toBe('Eve')
    expect(result.customer_phone).toBe('999')
  })
})

describe('mapLowStock', () => {
  it('maps basic data', () => {
    const result = mapLowStock({ name: 'Widget', quantity: 3, low_stock_threshold: 10 })
    expect(result.name).toBe('Widget')
    expect(result.stock).toBe(3)
    expect(result.threshold).toBe(10)
    expect(result.unit).toBe('units')
  })
  it('uses defaults for missing fields', () => {
    const result = mapLowStock({})
    expect(result.name).toBe('Unknown')
    expect(result.stock).toBe(0)
    expect(result.threshold).toBe(10)
    expect(result.unit).toBe('units')
  })
  it('uses alternate field names', () => {
    const result = mapLowStock({ product_name: 'Gadget', stock: 5, reorder_level: 20, unit: 'pcs' })
    expect(result.name).toBe('Gadget')
    expect(result.stock).toBe(5)
    expect(result.threshold).toBe(20)
    expect(result.unit).toBe('pcs')
  })
})

describe('normalizeProduct', () => {
  it('normalizes basic product', () => {
    const result = normalizeProduct({ id: 1, price: 10, quantity: 5 })
    expect(result.product_id).toBe(1)
    expect(result.price).toBe(10)
    expect(result.cost_price).toBe(0)
    expect(result.quantity).toBe(5)
    expect(result.unit).toBe('units')
  })
  it('preserves product_id from raw', () => {
    const result = normalizeProduct({ product_id: 99 })
    expect(result.product_id).toBe(99)
  })
  it('uses stock alias', () => {
    const result = normalizeProduct({ stock: 15 })
    expect(result.quantity).toBe(15)
  })
})

describe('extractSummary', () => {
  it('extracts from direct data', () => {
    const result = extractSummary({
      total_revenue: 1000, total_profit: 500, total_sales: 20, total_products: 15,
    })
    expect(result).toEqual({ total_revenue: 1000, total_profit: 500, total_sales: 20, total_products: 15 })
  })
  it('extracts from nested data.data', () => {
    const result = extractSummary({
      data: { revenue: 500, profit: 250, sales_count: 10, total_active_products: 8 },
    })
    expect(result).toEqual({ total_revenue: 500, total_profit: 250, total_sales: 10, total_products: 8 })
  })
  it('returns null for null input', () => expect(extractSummary(null)).toBeNull())
  it('returns null for empty object', () => expect(extractSummary({})).toBeNull())
  it('returns partial data', () => {
    const result = extractSummary({ total_revenue: 100 })
    expect(result?.total_revenue).toBe(100)
    expect(result?.total_profit).toBe(0)
  })
})

describe('extractProfit', () => {
  it('extracts full data', () => {
    const result = extractProfit({ total_revenue: 1000, total_cost: 400, total_profit: 600, items_sold: 50, sales_count: 10 })
    expect(result).toEqual({ total_revenue: 1000, total_cost: 400, total_profit: 600, items_sold: 50, sales_count: 10 })
  })
  it('returns null for null input', () => expect(extractProfit(null)).toBeNull())
  it('returns null when no revenue or profit', () => expect(extractProfit({ total_cost: 100 })).toBeNull())
  it('extracts from nested data', () => {
    const result = extractProfit({ data: { revenue: 800, cost: 300, profit: 500 } })
    expect(result?.total_revenue).toBe(800)
    expect(result?.total_cost).toBe(300)
    expect(result?.total_profit).toBe(500)
  })
})

describe('getDateRange', () => {
  it('returns today for 0 days', () => {
    const { start, end } = getDateRange(0)
    const today = new Date().toISOString().split('T')[0]
    expect(start).toBe(today)
    expect(end).toBe(today)
  })
  it('returns 7 days ago', () => {
    const { start } = getDateRange(7)
    const expected = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    expect(start).toBe(expected)
  })
  it('returns 30 days ago', () => {
    const { start } = getDateRange(30)
    const expected = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    expect(start).toBe(expected)
  })
})

describe('generateDateLabels', () => {
  it('generates labels for 3 days', () => {
    const labels = generateDateLabels('2024-01-01', '2024-01-03')
    expect(labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
  })
  it('generates single day', () => {
    const labels = generateDateLabels('2024-06-15', '2024-06-15')
    expect(labels).toEqual(['2024-06-15'])
  })
})

describe('parseApiError', () => {
  it('parses string detail', () => {
    expect(parseApiError({ response: { data: { detail: 'Not found' } } })).toBe('Not found')
  })
  it('parses array detail', () => {
    const err = { response: { data: { detail: [{ msg: 'Invalid' }, { msg: 'Required' }] } } }
    expect(parseApiError(err)).toBe('Invalid, Required')
  })
  it('returns error message for no response', () => {
    expect(parseApiError({ message: 'Network error' })).toBe('Network error')
  })
  it('returns default for no data', () => {
    expect(parseApiError({})).toBe('An error occurred')
  })
})

describe('isSuperAdminUser', () => {
  it('returns true for super admin email', () => {
    expect(isSuperAdminUser({ email: SUPER_ADMIN_EMAIL })).toBe(true)
  })
  it('returns true for super_admin role', () => {
    expect(isSuperAdminUser({ role: 'super_admin' })).toBe(true)
  })
  it('returns false for null user', () => expect(isSuperAdminUser(null)).toBe(false))
  it('returns false for undefined user', () => expect(isSuperAdminUser(undefined)).toBe(false))
  it('returns false for regular user', () => {
    expect(isSuperAdminUser({ role: 'user', email: 'test@test.com' })).toBe(false)
  })
  it('is case insensitive for email', () => {
    expect(isSuperAdminUser({ email: 'ADYSAMUEL68@GMAIL.COM' })).toBe(true)
  })
})

describe('isAdminRole', () => {
  it('returns true for admin', () => expect(isAdminRole('admin')).toBe(true))
  it('returns true for super_admin', () => expect(isAdminRole('super_admin')).toBe(true))
  it('returns true for manager', () => expect(isAdminRole('manager')).toBe(true))
  it('returns true for ADMIN', () => expect(isAdminRole('ADMIN')).toBe(true))
  it('returns true for OWNER', () => expect(isAdminRole('OWNER')).toBe(true))
  it('returns true for owner', () => expect(isAdminRole('owner')).toBe(true))
  it('returns false for cashier', () => expect(isAdminRole('cashier')).toBe(false))
  it('returns false for undefined', () => expect(isAdminRole(undefined)).toBe(false))
})

describe('isManagerRole', () => {
  it('returns true for manager', () => expect(isManagerRole('manager')).toBe(true))
  it('returns true for admin', () => expect(isManagerRole('admin')).toBe(true))
  it('returns false for cashier', () => expect(isManagerRole('cashier')).toBe(false))
  it('returns false for undefined', () => expect(isManagerRole(undefined)).toBe(false))
})

describe('isStaffRole', () => {
  it('returns true for cashier', () => expect(isStaffRole('cashier')).toBe(true))
  it('returns true for viewer', () => expect(isStaffRole('viewer')).toBe(true))
  it('returns true for STAFF', () => expect(isStaffRole('STAFF')).toBe(true))
  it('returns true for staff', () => expect(isStaffRole('staff')).toBe(true))
  it('returns false for admin', () => expect(isStaffRole('admin')).toBe(false))
  it('returns false for undefined', () => expect(isStaffRole(undefined)).toBe(false))
})

describe('isPlatformAdmin', () => {
  it('returns true for super admin', () => {
    expect(isPlatformAdmin({ email: SUPER_ADMIN_EMAIL, role: 'super_admin' })).toBe(true)
  })
  it('returns true for admin role', () => {
    expect(isPlatformAdmin({ role: 'admin', email: 'other@test.com' })).toBe(true)
  })
  it('returns false for regular user', () => {
    expect(isPlatformAdmin({ role: 'user', email: 'test@test.com' })).toBe(false)
  })
  it('returns false for null', () => expect(isPlatformAdmin(null)).toBe(false))
})
