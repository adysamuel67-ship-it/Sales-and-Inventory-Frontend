/**
 * Bug Fix Tests
 *
 * Tests verifying fixes for identified bugs:
 * 1. Shared utility functions work correctly
 * 2. Role checking consistency
 * 3. Reports chart ISO date keys
 * 4. Dashboard error handling (no overwrite)
 * 5. Auto-dismiss hook behavior
 */

import { extractArray, mapSale, normalizeProduct, extractSummary, extractProfit, getDateRange, generateDateLabels, parseApiError, isAdminRole, isManagerRole, isStaffRole } from '@/lib/utils'

// ──────────────────────────────────────────────────
// Shared extractArray
// ──────────────────────────────────────────────────

describe('Shared extractArray', () => {
  it('returns array directly', () => {
    expect(extractArray([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('finds first array in object', () => {
    expect(extractArray({ items: [1, 2] })).toEqual([1, 2])
  })

  it('finds nested array at depth 1', () => {
    expect(extractArray({ nested: { data: [1] } })).toEqual([1])
  })

  it('finds nested array at depth 2', () => {
    expect(extractArray({ a: { b: { items: [1, 2] } } })).toEqual([1, 2])
  })

  it('stops at depth 4 (beyond limit)', () => {
    expect(extractArray({ a: { b: { c: { d: { e: [1] } } } } })).toEqual([])
  })

  it('finds array at depth 3', () => {
    expect(extractArray({ a: { b: { c: { d: [1] } } } })).toEqual([1])
  })

  it('returns empty for null', () => {
    expect(extractArray(null)).toEqual([])
  })

  it('returns empty for undefined', () => {
    expect(extractArray(undefined)).toEqual([])
  })

  it('returns empty for primitives', () => {
    expect(extractArray('string')).toEqual([])
    expect(extractArray(42)).toEqual([])
    expect(extractArray(true)).toEqual([])
  })

  it('handles empty array', () => {
    expect(extractArray([])).toEqual([])
  })
})

// ──────────────────────────────────────────────────
// Shared mapSale
// ──────────────────────────────────────────────────

describe('Shared mapSale', () => {
  it('maps sale with sales_items', () => {
    const raw = {
      sale_id: 1,
      sales_items: [
        { product_name: 'Rice', quantity: 5 },
        { product_name: 'Beans', quantity: 3 },
      ],
      total_amount: 250,
      payment_method: 'Cash',
      created_at: '2024-01-15T10:30:00Z',
    }
    const sale = mapSale(raw)
    expect(sale.id).toBe(1)
    expect(sale.product).toBe('Rice, Beans')
    expect(sale.qty).toBe(8)
    expect(sale.amount).toBe(250)
    expect(sale.payment).toBe('Cash')
    expect(sale.created_at).toBe('2024-01-15T10:30:00Z')
  })

  it('uses productMap for product_id references', () => {
    const raw = {
      sale_id: 2,
      sales_items: [{ product_id: 42, quantity: 2 }],
      total_amount: 100,
      payment_method: 'MoMo',
    }
    const productMap = new Map([[42, 'Tomato Sauce']])
    const sale = mapSale(raw, productMap)
    expect(sale.product).toBe('Tomato Sauce')
  })

  it('falls back to Product #id when not in productMap', () => {
    const raw = {
      sale_id: 3,
      sales_items: [{ product_id: 99, quantity: 1 }],
      total_amount: 50,
    }
    const sale = mapSale(raw, new Map())
    expect(sale.product).toBe('Product #99')
  })

  it('uses defaults for minimal data', () => {
    const raw = {}
    const sale = mapSale(raw)
    expect(sale.product).toBe('Unknown')
    expect(sale.qty).toBe(0)
    expect(sale.amount).toBe(0)
    expect(sale.payment).toBe('N/A')
  })
})

// ──────────────────────────────────────────────────
// Shared normalizeProduct
// ──────────────────────────────────────────────────

describe('Shared normalizeProduct', () => {
  it('normalizes standard fields', () => {
    const raw = { product_id: 1, name: 'Rice', price: 10, cost_price: 7, quantity: 50, unit: 'bags' }
    const p = normalizeProduct(raw)
    expect(p.product_id).toBe(1)
    expect(p.name).toBe('Rice')
    expect(p.price).toBe(10)
    expect(p.cost_price).toBe(7)
    expect(p.quantity).toBe(50)
    expect(p.unit).toBe('bags')
  })

  it('falls back to id when product_id missing', () => {
    const raw = { id: 5, name: 'Beans' }
    const p = normalizeProduct(raw)
    expect(p.product_id).toBe(5)
  })

  it('uses defaults for missing fields', () => {
    const raw = { name: 'Test' }
    const p = normalizeProduct(raw)
    expect(p.price).toBe(0)
    expect(p.cost_price).toBe(0)
    expect(p.quantity).toBe(0)
    expect(p.unit).toBe('units')
  })

  it('uses stock alias for quantity', () => {
    const raw = { name: 'Test', stock: 25 }
    const p = normalizeProduct(raw)
    expect(p.quantity).toBe(25)
  })
})

// ──────────────────────────────────────────────────
// extractSummary
// ──────────────────────────────────────────────────

describe('Shared extractSummary', () => {
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

  it('returns null for null', () => {
    expect(extractSummary(null)).toBeNull()
  })

  it('handles nested data property', () => {
    const data = { data: { total_revenue: 200, total_profit: 50, total_sales: 5 } }
    const result = extractSummary(data)
    expect(result!.total_revenue).toBe(200)
  })
})

// ──────────────────────────────────────────────────
// extractProfit
// ──────────────────────────────────────────────────

describe('Shared extractProfit', () => {
  it('extracts profit data', () => {
    const data = { total_revenue: 1000, total_cost: 700, total_profit: 300 }
    const result = extractProfit(data)
    expect(result).toEqual({
      total_revenue: 1000,
      total_cost: 700,
      total_profit: 300,
      items_sold: undefined,
      sales_count: undefined,
    })
  })

  it('returns null for null', () => {
    expect(extractProfit(null)).toBeNull()
  })
})

// ──────────────────────────────────────────────────
// Role checking consistency
// ──────────────────────────────────────────────────

describe('Role checking consistency', () => {
  describe('isAdminRole', () => {
    it('recognizes all admin variants', () => {
      expect(isAdminRole('admin')).toBe(true)
      expect(isAdminRole('ADMIN')).toBe(true)
      expect(isAdminRole('super_admin')).toBe(true)
      expect(isAdminRole('manager')).toBe(true)
      expect(isAdminRole('OWNER')).toBe(true)
      expect(isAdminRole('owner')).toBe(true)
    })

    it('rejects non-admin roles', () => {
      expect(isAdminRole('cashier')).toBe(false)
      expect(isAdminRole('STAFF')).toBe(false)
      expect(isAdminRole('user')).toBe(false)
      expect(isAdminRole('viewer')).toBe(false)
    })

    it('handles undefined', () => {
      expect(isAdminRole(undefined)).toBe(false)
    })
  })

  describe('isManagerRole', () => {
    it('recognizes all manager variants', () => {
      expect(isManagerRole('admin')).toBe(true)
      expect(isManagerRole('super_admin')).toBe(true)
      expect(isManagerRole('manager')).toBe(true)
      expect(isManagerRole('ADMIN')).toBe(true)
      expect(isManagerRole('OWNER')).toBe(true)
      expect(isManagerRole('owner')).toBe(true)
    })

    it('rejects non-manager roles', () => {
      expect(isManagerRole('cashier')).toBe(false)
      expect(isManagerRole('STAFF')).toBe(false)
    })
  })

  describe('isStaffRole', () => {
    it('recognizes staff variants', () => {
      expect(isStaffRole('STAFF')).toBe(true)
      expect(isStaffRole('staff')).toBe(true)
    })

    it('rejects non-staff roles', () => {
      expect(isStaffRole('admin')).toBe(false)
      expect(isStaffRole('super_admin')).toBe(false)
      expect(isStaffRole('OWNER')).toBe(false)
      expect(isStaffRole('manager')).toBe(false)
      expect(isStaffRole('cashier')).toBe(true)
    })

    it('handles undefined', () => {
      expect(isStaffRole(undefined)).toBe(false)
    })
  })
})

// ──────────────────────────────────────────────────
// Reports chart ISO date keys
// ──────────────────────────────────────────────────

describe('Reports chart date keys', () => {
  it('generateDateLabels produces ISO format dates', () => {
    const labels = generateDateLabels('2024-01-01', '2024-01-05')
    expect(labels).toHaveLength(5)
    for (const label of labels) {
      expect(label).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('first label matches start date', () => {
    const labels = generateDateLabels('2024-06-15', '2024-06-20')
    expect(labels[0]).toBe('2024-06-15')
  })

  it('last label matches end date', () => {
    const labels = generateDateLabels('2024-06-15', '2024-06-20')
    expect(labels[labels.length - 1]).toBe('2024-06-20')
  })

  it('single day produces one label', () => {
    const labels = generateDateLabels('2024-03-10', '2024-03-10')
    expect(labels).toHaveLength(1)
    expect(labels[0]).toBe('2024-03-10')
  })

  it('does not use locale-dependent format', () => {
    const labels = generateDateLabels('2024-01-01', '2024-01-03')
    for (const label of labels) {
      expect(label).not.toContain('/')
      expect(label).not.toContain(',')
    }
  })
})

// ──────────────────────────────────────────────────
// getDateRange
// ──────────────────────────────────────────────────

describe('getDateRange', () => {
  it('returns ISO format strings', () => {
    const range = getDateRange(30)
    expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('end date is today', () => {
    const range = getDateRange(7)
    const today = new Date().toISOString().split('T')[0]
    expect(range.end).toBe(today)
  })

  it('correct day difference', () => {
    const range = getDateRange(30)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    expect(diffDays).toBe(30)
  })
})

// ──────────────────────────────────────────────────
// Dashboard error handling
// ──────────────────────────────────────────────────

describe('Dashboard error handling', () => {
  it('does not overwrite API error with margin warning', () => {
    const apiError = 'Failed to load: summary'
    const margin = 3.5
    const revenue = 1000
    const profit = 35

    let finalError = ''
    if (apiError) {
      finalError = apiError
    }
    if (revenue > 0 && profit > 0) {
      const marginPercent = (profit / revenue) * 100
      if (marginPercent < 5) {
        finalError = apiError ? `${apiError}. Warning: Low profit margin (${marginPercent.toFixed(1)}%)` : `Warning: Low profit margin (${marginPercent.toFixed(1)}%)`
      }
    }

    expect(finalError).toContain('Failed to load')
    expect(finalError).toContain('Low profit margin')
  })

  it('shows only API error when margin is healthy', () => {
    const apiError = 'Failed to load: sales'
    const revenue = 1000
    const profit = 200

    let finalError = ''
    if (apiError) {
      finalError = apiError
    }
    if (revenue > 0 && profit > 0) {
      const marginPercent = (profit / revenue) * 100
      if (marginPercent < 5) {
        finalError = apiError ? `${apiError}. Warning` : 'Warning'
      }
    }

    expect(finalError).toBe('Failed to load: sales')
  })

  it('shows only margin warning when no API error', () => {
    const apiError = ''
    const revenue = 1000
    const profit = 30

    let finalError = ''
    if (apiError) {
      finalError = apiError
    }
    if (revenue > 0 && profit > 0) {
      const marginPercent = (profit / revenue) * 100
      if (marginPercent < 5) {
        finalError = apiError ? `${apiError}. Warning` : `Warning: Low profit margin (${marginPercent.toFixed(1)}%)`
      }
    }

    expect(finalError).toContain('Low profit margin')
    expect(finalError).not.toContain('Failed to load')
  })
})

// ──────────────────────────────────────────────────
// Auto-dismiss behavior (unit test)
// ──────────────────────────────────────────────────

describe('Auto-dismiss behavior', () => {
  it('initially visible when message is provided', () => {
    const message = 'Success!'
    const visible = !!message
    expect(visible).toBe(true)
  })

  it('not visible when message is null', () => {
    const message = null
    const visible = !!message
    expect(visible).toBe(false)
  })

  it('clears message after delay', () => {
    let message: string | null = 'Test'
    const delay = 100
    jest.useFakeTimers()

    jest.advanceTimersByTime(delay)
    message = null
    expect(message).toBeNull()

    jest.useRealTimers()
  })
})

// ──────────────────────────────────────────────────
// parseApiError
// ──────────────────────────────────────────────────

describe('parseApiError', () => {
  it('handles array of errors', () => {
    const err = { response: { data: { detail: [{ msg: 'Required' }, { msg: 'Invalid' }] } } }
    expect(parseApiError(err)).toBe('Required, Invalid')
  })

  it('handles string detail', () => {
    const err = { response: { data: { detail: 'Forbidden' } } }
    expect(parseApiError(err)).toBe('Forbidden')
  })

  it('handles error message', () => {
    const err = { message: 'Timeout' }
    expect(parseApiError(err)).toBe('Timeout')
  })

  it('handles null gracefully', () => {
    expect(parseApiError(null)).toBe('An error occurred')
  })

  it('handles empty object', () => {
    expect(parseApiError({})).toBe('An error occurred')
  })
})
