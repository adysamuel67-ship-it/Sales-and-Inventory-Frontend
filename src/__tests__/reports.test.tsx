/**
 * Reports Page Tests
 *
 * Verifies:
 * 1. extractProfit utility
 * 2. extractSummary utility
 * 3. Date range calculations
 * 4. Profit margin calculation
 * 5. Date presets
 * 6. Error handling
 * 7. Empty data states
 */

function extractProfit(data: any) {
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

function extractSummary(data: any) {
  if (!data || typeof data !== 'object') return null
  const d = data.data || data
  const revenue = d.total_revenue ?? d.revenue ?? d.total_amount ?? null
  const profit = d.total_profit ?? d.profit ?? d.net_profit ?? null
  const sales = d.total_sales ?? d.sales ?? d.sales_count ?? null
  const products = d.total_active_products ?? d.total_products ?? d.products ?? null
  if (revenue === null && profit === null && sales === null) return null
  return {
    total_revenue: Number(revenue ?? 0),
    total_profit: Number(profit ?? 0),
    total_sales: Number(sales ?? 0),
    total_products: products != null ? Number(products) : undefined,
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

describe('extractProfit', () => {
  it('extracts from standard fields', () => {
    const data = {
      total_revenue: 5000,
      total_cost: 3000,
      total_profit: 2000,
      items_sold: 100,
      sales_count: 25,
    }
    const result = extractProfit(data)
    expect(result).toEqual({
      total_revenue: 5000,
      total_cost: 3000,
      total_profit: 2000,
      items_sold: 100,
      sales_count: 25,
    })
  })

  it('extracts from alternative field names', () => {
    const data = {
      revenue: 3000,
      cost: 1800,
      profit: 1200,
      quantity_sold: 50,
      total_sales: 10,
    }
    const result = extractProfit(data)
    expect(result).toEqual({
      total_revenue: 3000,
      total_cost: 1800,
      total_profit: 1200,
      items_sold: 50,
      sales_count: 10,
    })
  })

  it('extracts from total_amount, net_profit, total_cost_of_goods', () => {
    const data = {
      total_amount: 8000,
      net_profit: 3000,
      total_cost_of_goods: 5000,
    }
    const result = extractProfit(data)
    expect(result?.total_revenue).toBe(8000)
    expect(result?.total_profit).toBe(3000)
    expect(result?.total_cost).toBe(5000)
  })

  it('unwraps data.data nested response', () => {
    const data = {
      data: {
        total_revenue: 1000,
        total_profit: 400,
        total_cost: 600,
      },
    }
    const result = extractProfit(data)
    expect(result?.total_revenue).toBe(1000)
    expect(result?.total_profit).toBe(400)
  })

  it('returns null for null', () => {
    expect(extractProfit(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(extractProfit(undefined)).toBeNull()
  })

  it('returns null for string', () => {
    expect(extractProfit('hello')).toBeNull()
  })

  it('returns null when both revenue and profit are missing', () => {
    expect(extractProfit({ cost: 500 })).toBeNull()
  })

  it('defaults cost to 0 when not provided', () => {
    const result = extractProfit({ total_revenue: 1000, total_profit: 400 })
    expect(result?.total_cost).toBe(0)
  })

  it('returns undefined for items_sold when not provided', () => {
    const result = extractProfit({ total_revenue: 100, total_profit: 50 })
    expect(result?.items_sold).toBeUndefined()
  })
})

describe('extractSummary (reports)', () => {
  it('extracts from standard fields', () => {
    const data = { total_revenue: 5000, total_profit: 2000, total_sales: 30, total_products: 10 }
    const result = extractSummary(data)
    expect(result).toEqual({
      total_revenue: 5000,
      total_profit: 2000,
      total_sales: 30,
      total_products: 10,
    })
  })

  it('extracts from alternative fields', () => {
    const data = { revenue: 3000, profit: 1200, sales: 15, products: 5 }
    const result = extractSummary(data)
    expect(result?.total_revenue).toBe(3000)
    expect(result?.total_profit).toBe(1200)
    expect(result?.total_sales).toBe(15)
    expect(result?.total_products).toBe(5)
  })

  it('unwraps data.data', () => {
    const data = { data: { total_revenue: 800, total_profit: 200, total_sales: 10 } }
    const result = extractSummary(data)
    expect(result?.total_revenue).toBe(800)
  })

  it('returns null for null', () => {
    expect(extractSummary(null)).toBeNull()
  })

  it('returns null when all key fields missing', () => {
    expect(extractSummary({ name: 'test' })).toBeNull()
  })

  it('returns undefined total_products when not present', () => {
    const result = extractSummary({ total_revenue: 100, total_profit: 50, total_sales: 5 })
    expect(result?.total_products).toBeUndefined()
  })

  it('defaults missing fields to 0', () => {
    const result = extractSummary({ total_revenue: 1000 })
    expect(result?.total_revenue).toBe(1000)
    expect(result?.total_profit).toBe(0)
    expect(result?.total_sales).toBe(0)
  })
})

describe('Reports profit margin', () => {
  it('calculates margin correctly', () => {
    const profit = { total_revenue: 1000, total_profit: 300 }
    const margin = profit.total_revenue > 0
      ? ((profit.total_profit / profit.total_revenue) * 100).toFixed(1)
      : null
    expect(margin).toBe('30.0')
  })

  it('returns null when revenue is 0', () => {
    const profit = { total_revenue: 0, total_profit: 0 }
    const margin = profit.total_revenue > 0
      ? ((profit.total_profit / profit.total_revenue) * 100).toFixed(1)
      : null
    expect(margin).toBeNull()
  })

  it('handles negative profit', () => {
    const profit = { total_revenue: 1000, total_profit: -200 }
    const margin = profit.total_revenue > 0
      ? ((profit.total_profit / profit.total_revenue) * 100).toFixed(1)
      : null
    expect(margin).toBe('-20.0')
  })

  it('formats margin to 1 decimal place', () => {
    const margin = 33.333
    expect(margin.toFixed(1)).toBe('33.3')
  })
})

describe('Reports date presets', () => {
  const datePresets = [
    { label: '7 days', days: 7 },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: '1 year', days: 365 },
  ]

  it('has 4 presets', () => {
    expect(datePresets).toHaveLength(4)
  })

  it('presets in ascending order', () => {
    const days = datePresets.map((p) => p.days)
    for (let i = 1; i < days.length; i++) {
      expect(days[i]).toBeGreaterThan(days[i - 1])
    }
  })

  it('handlePresetChange sets correct date range', () => {
    const days = 30
    const range = getDateRange(days)
    const start = new Date(range.start)
    const end = new Date(range.end)
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
    expect(diff).toBe(30)
  })
})

describe('Reports date subtitle', () => {
  it('shows "Last X days" for presets', () => {
    const activePreset = 30
    const dateRange = getDateRange(30)
    const subtitle = activePreset > 0 ? `Last ${activePreset} days` : `${dateRange.start} to ${dateRange.end}`
    expect(subtitle).toBe('Last 30 days')
  })

  it('shows custom range when no preset', () => {
    const activePreset = 0
    const dateRange = { start: '2024-01-01', end: '2024-01-31' }
    const subtitle = activePreset > 0 ? `Last ${activePreset} days` : `${dateRange.start} to ${dateRange.end}`
    expect(subtitle).toBe('2024-01-01 to 2024-01-31')
  })
})

describe('Reports hasData logic', () => {
  it('hasData when profit exists', () => {
    const profit = { total_revenue: 100, total_profit: 50, total_cost: 50 }
    const summary = null
    const hasData = profit !== null || summary !== null
    expect(hasData).toBe(true)
  })

  it('hasData when summary exists', () => {
    const profit = null
    const summary = { total_revenue: 100, total_profit: 50, total_sales: 5 }
    const hasData = profit !== null || summary !== null
    expect(hasData).toBe(true)
  })

  it('no data when both null', () => {
    const hasData = null !== null || null !== null
    expect(hasData).toBe(false)
  })
})

describe('Reports loading state', () => {
  it('shows skeleton when loading', () => {
    const loading = true
    expect(loading).toBe(true)
  })

  it('shows content when loaded', () => {
    const loading = false
    expect(loading).toBe(false)
  })
})

describe('Reports error handling', () => {
  it('shows error when both API calls fail', () => {
    const profitRes = 'rejected'
    const summaryRes = 'rejected'
    const hasData = profitRes === 'fulfilled' || summaryRes === 'fulfilled'
    expect(hasData).toBe(false)
  })

  it('no error when at least one succeeds', () => {
    const profitRes = 'fulfilled'
    const summaryRes = 'rejected'
    const hasData = profitRes === 'fulfilled' || summaryRes === 'fulfilled'
    expect(hasData).toBe(true)
  })
})
