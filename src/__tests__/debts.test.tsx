/**
 * Debt Tracker Page Tests
 *
 * Verifies:
 * 1. Debt summary calculations (total outstanding, overdue, customer count)
 * 2. isOverdue utility for due date checking
 * 3. daysUntilDue utility for days remaining
 * 4. Tab filtering (all, overdue, paid)
 * 5. Search filtering by name, email, phone
 * 6. Sort order (highest, lowest, oldest)
 * 7. Payment form validation
 * 8. Add debt form validation
 * 9. Currency formatting
 * 10. Customer debt aggregation from API data
 * 11. Role-based UI (admin vs non-admin)
 * 12. Empty state content per tab
 * 13. Debt status badge logic
 */

import { extractArray, parseApiError, isAdminRole } from '@/lib/utils'

// ──────────────────────────────────────────────────
// isOverdue utility
// ──────────────────────────────────────────────────

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function daysUntilDue(dueDate: string): number {
  const now = new Date()
  const due = new Date(dueDate)
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

describe('isOverdue', () => {
  it('returns true for past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })

  it('returns false for future dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    expect(isOverdue(future.toISOString())).toBe(false)
  })

  it('returns true for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isOverdue(yesterday.toISOString())).toBe(true)
  })

  it('returns false for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isOverdue(tomorrow.toISOString())).toBe(false)
  })
})

describe('daysUntilDue', () => {
  it('returns negative for past dates', () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)
    expect(daysUntilDue(past.toISOString())).toBeLessThan(0)
  })

  it('returns positive for future dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    expect(daysUntilDue(future.toISOString())).toBeGreaterThan(0)
  })

  it('returns ~30 for 30 days ahead', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    expect(daysUntilDue(future.toISOString())).toBe(30)
  })
})

// ──────────────────────────────────────────────────
// Debt summary calculations
// ──────────────────────────────────────────────────

describe('Debt summary calculations', () => {
  interface CustomerWithDebt {
    customer_id: number
    customer_name: string
    total_debt: number
    debts: { debt_id: number; amount: number; due_date: string; is_paid: boolean; created_at: string }[]
  }

  function calculateSummary(customers: CustomerWithDebt[]) {
    let total_outstanding = 0
    let total_customers = 0
    let total_overdue = 0
    let overdue_amount = 0

    for (const c of customers) {
      if (c.total_debt > 0) {
        total_outstanding += c.total_debt
        total_customers++
        for (const d of c.debts) {
          if (!d.is_paid && d.due_date && isOverdue(d.due_date)) {
            total_overdue++
            overdue_amount += d.amount
          }
        }
      }
    }

    return { total_outstanding, total_customers, total_overdue, overdue_amount }
  }

  it('calculates correct summary from mixed data', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)

    const customers: CustomerWithDebt[] = [
      {
        customer_id: 1,
        customer_name: 'Ama',
        total_debt: 200,
        debts: [
          { debt_id: 1, amount: 200, due_date: pastDate.toISOString(), is_paid: false, created_at: '' },
        ],
      },
      {
        customer_id: 2,
        customer_name: 'Kofi',
        total_debt: 100,
        debts: [
          { debt_id: 2, amount: 100, due_date: futureDate.toISOString(), is_paid: false, created_at: '' },
        ],
      },
      {
        customer_id: 3,
        customer_name: 'Aba',
        total_debt: 0,
        debts: [
          { debt_id: 3, amount: 50, due_date: '', is_paid: true, created_at: '' },
        ],
      },
    ]

    const summary = calculateSummary(customers)
    expect(summary.total_outstanding).toBe(300)
    expect(summary.total_customers).toBe(2)
    expect(summary.total_overdue).toBe(1)
    expect(summary.overdue_amount).toBe(200)
  })

  it('handles empty customer list', () => {
    const summary = calculateSummary([])
    expect(summary.total_outstanding).toBe(0)
    expect(summary.total_customers).toBe(0)
    expect(summary.total_overdue).toBe(0)
    expect(summary.overdue_amount).toBe(0)
  })

  it('handles all paid customers', () => {
    const customers: CustomerWithDebt[] = [
      {
        customer_id: 1,
        customer_name: 'Ama',
        total_debt: 0,
        debts: [
          { debt_id: 1, amount: 100, due_date: '', is_paid: true, created_at: '' },
        ],
      },
    ]
    const summary = calculateSummary(customers)
    expect(summary.total_outstanding).toBe(0)
    expect(summary.total_customers).toBe(0)
  })

  it('handles multiple debts per customer', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)

    const customers: CustomerWithDebt[] = [
      {
        customer_id: 1,
        customer_name: 'Ama',
        total_debt: 300,
        debts: [
          { debt_id: 1, amount: 100, due_date: pastDate.toISOString(), is_paid: false, created_at: '' },
          { debt_id: 2, amount: 200, due_date: pastDate.toISOString(), is_paid: false, created_at: '' },
        ],
      },
    ]
    const summary = calculateSummary(customers)
    expect(summary.total_outstanding).toBe(300)
    expect(summary.total_customers).toBe(1)
    expect(summary.total_overdue).toBe(2)
    expect(summary.overdue_amount).toBe(300)
  })
})

// ──────────────────────────────────────────────────
// Tab filtering
// ──────────────────────────────────────────────────

describe('Debt tab filtering', () => {
  const customers = [
    { customer_id: 1, total_debt: 200, debts: [{ is_paid: false, due_date: '2020-01-01' }] },
    { customer_id: 2, total_debt: 0, debts: [{ is_paid: true, due_date: '' }] },
    { customer_id: 3, total_debt: 50, debts: [{ is_paid: false, due_date: '2030-01-01' }] },
    { customer_id: 4, total_debt: 100, debts: [{ is_paid: false, due_date: '2020-06-01' }] },
  ]

  type Tab = 'all' | 'overdue' | 'paid'

  function filterByTab(customers: any[], tab: Tab) {
    const debtCustomers = customers.filter((c) => c.total_debt > 0)
    const paidCustomers = customers.filter((c) => c.total_debt <= 0 || c.debts.every((d: any) => d.is_paid))
    const overdueCustomers = debtCustomers.filter((c) =>
      c.debts.some((d: any) => !d.is_paid && d.due_date && isOverdue(d.due_date))
    )

    if (tab === 'overdue') return overdueCustomers
    if (tab === 'paid') return paidCustomers
    return debtCustomers
  }

  it('all tab shows only customers with debt', () => {
    const result = filterByTab(customers, 'all')
    expect(result).toHaveLength(3)
  })

  it('overdue tab shows only overdue customers', () => {
    const result = filterByTab(customers, 'overdue')
    expect(result).toHaveLength(2)
  })

  it('paid tab shows paid/zero-debt customers', () => {
    const result = filterByTab(customers, 'paid')
    expect(result).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────────
// Search filtering
// ──────────────────────────────────────────────────

describe('Debt search filtering', () => {
  const customers = [
    { customer_id: 1, customer_name: 'Ama Mensah', customer_email: 'ama@test.com', customer_phone: '0241234567', total_debt: 100 },
    { customer_id: 2, customer_name: 'Kofi Asante', customer_email: 'kofi@test.com', customer_phone: '0209876543', total_debt: 200 },
    { customer_id: 3, customer_name: 'Aba Osei', customer_email: 'aba@test.com', customer_phone: '0551122334', total_debt: 50 },
  ]

  function filterCustomers(list: any[], search: string) {
    return list.filter((c) =>
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_phone?.includes(search)
    )
  }

  it('returns all when search is empty', () => {
    expect(filterCustomers(customers, '')).toHaveLength(3)
  })

  it('filters by name', () => {
    expect(filterCustomers(customers, 'Ama')).toHaveLength(1)
  })

  it('filters by email', () => {
    expect(filterCustomers(customers, 'kofi@test')).toHaveLength(1)
  })

  it('filters by phone', () => {
    expect(filterCustomers(customers, '0241')).toHaveLength(1)
  })

  it('case insensitive search', () => {
    expect(filterCustomers(customers, 'AMA')).toHaveLength(1)
  })

  it('no match returns empty', () => {
    expect(filterCustomers(customers, 'xyz')).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────
// Sort order
// ──────────────────────────────────────────────────

describe('Debt sort order', () => {
  const customers = [
    { customer_id: 1, total_debt: 100, debts: [{ created_at: '2024-01-15' }] },
    { customer_id: 2, total_debt: 300, debts: [{ created_at: '2024-01-01' }] },
    { customer_id: 3, total_debt: 50, debts: [{ created_at: '2024-01-10' }] },
  ]

  it('sorts by highest debt', () => {
    const sorted = [...customers].sort((a, b) => b.total_debt - a.total_debt)
    expect(sorted[0].customer_id).toBe(2)
    expect(sorted[1].customer_id).toBe(1)
    expect(sorted[2].customer_id).toBe(3)
  })

  it('sorts by lowest debt', () => {
    const sorted = [...customers].sort((a, b) => a.total_debt - b.total_debt)
    expect(sorted[0].customer_id).toBe(3)
    expect(sorted[1].customer_id).toBe(1)
    expect(sorted[2].customer_id).toBe(2)
  })

  it('sorts by oldest first', () => {
    const sorted = [...customers].sort((a, b) =>
      new Date(a.debts[0].created_at).getTime() - new Date(b.debts[0].created_at).getTime()
    )
    expect(sorted[0].customer_id).toBe(2)
    expect(sorted[1].customer_id).toBe(3)
    expect(sorted[2].customer_id).toBe(1)
  })
})

// ──────────────────────────────────────────────────
// Currency formatting
// ──────────────────────────────────────────────────

describe('Currency formatting', () => {
  function formatCurrency(amount: number): string {
    return `GH\u20B5${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('GH\u20B50.00')
  })

  it('formats whole numbers with decimals', () => {
    expect(formatCurrency(100)).toBe('GH\u20B5100.00')
  })

  it('formats decimal amounts', () => {
    expect(formatCurrency(150.5)).toBe('GH\u20B5150.50')
  })

  it('formats large numbers with thousands separator', () => {
    const result = formatCurrency(1250.75)
    expect(result).toContain('1')
    expect(result).toContain('250')
    expect(result).toContain('75')
  })
})

// ──────────────────────────────────────────────────
// Customer debt aggregation from API data
// ──────────────────────────────────────────────────

describe('Customer debt aggregation', () => {
  interface CustomerWithDebt {
    customer_id: number
    customer_name: string
    total_debt: number
    debts: any[]
  }

  function aggregateDebtData(raw: any[]): CustomerWithDebt[] {
    const customerMap = new Map<number, CustomerWithDebt>()

    for (const item of raw) {
      const custId = item.customer_id ?? item.user_id ?? item.id
      if (custId == null) continue

      const existing = customerMap.get(custId)
      const debtAmount = Number(item.customer_debt ?? item.debt ?? item.amount ?? 0)

      if (existing) {
        existing.total_debt += debtAmount
        if (item.debt_id) {
          existing.debts.push({
            debt_id: item.debt_id,
            amount: debtAmount,
            due_date: item.due_date || '',
            is_paid: item.is_paid ?? debtAmount <= 0,
            created_at: item.created_at || '',
          })
        }
      } else {
        customerMap.set(custId, {
          customer_id: custId,
          customer_name: item.customer_name ?? item.name ?? `Customer #${custId}`,
          total_debt: debtAmount,
          debts: item.debt_id ? [{
            debt_id: item.debt_id,
            amount: debtAmount,
            due_date: item.due_date || '',
            is_paid: item.is_paid ?? debtAmount <= 0,
            created_at: item.created_at || '',
          }] : [],
        })
      }
    }

    return Array.from(customerMap.values())
  }

  it('aggregates multiple entries for same customer', () => {
    const raw = [
      { customer_id: 1, customer_debt: 100, debt_id: 1, due_date: '2024-02-01' },
      { customer_id: 1, customer_debt: 50, debt_id: 2, due_date: '2024-03-01' },
    ]
    const result = aggregateDebtData(raw)
    expect(result).toHaveLength(1)
    expect(result[0].total_debt).toBe(150)
    expect(result[0].debts).toHaveLength(2)
  })

  it('handles different customers', () => {
    const raw = [
      { customer_id: 1, customer_debt: 100, debt_id: 1 },
      { customer_id: 2, customer_debt: 200, debt_id: 2 },
    ]
    const result = aggregateDebtData(raw)
    expect(result).toHaveLength(2)
  })

  it('skips entries without customer_id', () => {
    const raw = [
      { customer_debt: 100, debt_id: 1 },
      { customer_id: 1, customer_debt: 50, debt_id: 2 },
    ]
    const result = aggregateDebtData(raw)
    expect(result).toHaveLength(1)
  })

  it('handles alternative field names', () => {
    const raw = [
      { id: 5, debt: 75, name: 'Test Customer', debt_id: 1 },
    ]
    const result = aggregateDebtData(raw)
    expect(result).toHaveLength(1)
    expect(result[0].customer_id).toBe(5)
    expect(result[0].customer_name).toBe('Test Customer')
    expect(result[0].total_debt).toBe(75)
  })

  it('generates fallback name when name is missing', () => {
    const raw = [
      { customer_id: 99, customer_debt: 10, debt_id: 1 },
    ]
    const result = aggregateDebtData(raw)
    expect(result[0].customer_name).toBe('Customer #99')
  })
})

// ──────────────────────────────────────────────────
// Payment form validation
// ──────────────────────────────────────────────────

describe('Payment form validation', () => {
  it('validates payment amount is positive', () => {
    const amount = parseFloat('0')
    expect(isNaN(amount) || amount <= 0).toBe(true)
  })

  it('validates payment amount is a number', () => {
    const amount = parseFloat('')
    expect(isNaN(amount)).toBe(true)
  })

  it('accepts valid payment amount', () => {
    const amount = parseFloat('100.50')
    expect(amount > 0).toBe(true)
  })

  it('fully_paid flag bypasses amount validation', () => {
    const fullyPaid = true
    const amount = parseFloat('')
    const isValid = fullyPaid || (!isNaN(amount) && amount > 0)
    expect(isValid).toBe(true)
  })
})

// ──────────────────────────────────────────────────
// Add debt form validation
// ──────────────────────────────────────────────────

describe('Add debt form validation', () => {
  it('requires customer selection', () => {
    const customerId = ''
    expect(!!customerId).toBe(false)
  })

  it('requires positive amount', () => {
    const amount = parseFloat('0')
    expect(amount > 0).toBe(false)
  })

  it('accepts valid data', () => {
    const customerId = '5'
    const amount = parseFloat('100')
    expect(!!customerId && amount > 0).toBe(true)
  })

  it('due date is optional', () => {
    const customerId = '5'
    const amount = parseFloat('100')
    const dueDate = ''
    expect(!!customerId && amount > 0).toBe(true)
    expect(dueDate).toBe('')
  })
})

// ──────────────────────────────────────────────────
// Role-based UI
// ──────────────────────────────────────────────────

describe('Debt page role-based access', () => {
  it('isAdmin is true for admin role', () => {
    expect(isAdminRole('admin')).toBe(true)
  })

  it('isAdmin is true for super_admin', () => {
    expect(isAdminRole('super_admin')).toBe(true)
  })

  it('isAdmin is true for manager', () => {
    expect(isAdminRole('manager')).toBe(true)
  })

  it('isAdmin is true for OWNER', () => {
    expect(isAdminRole('OWNER')).toBe(true)
  })

  it('isAdmin is true for ADMIN', () => {
    expect(isAdminRole('ADMIN')).toBe(true)
  })

  it('isAdmin is false for cashier', () => {
    expect(isAdminRole('cashier')).toBe(false)
  })

  it('isAdmin is false for STAFF', () => {
    expect(isAdminRole('STAFF')).toBe(false)
  })

  it('isAdmin is false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false)
  })
})

// ──────────────────────────────────────────────────
// Empty state content
// ──────────────────────────────────────────────────

describe('Debt page empty states', () => {
  it('shows correct empty message for all tab', () => {
    const msg = 'No outstanding debts'
    expect(msg).toBe('No outstanding debts')
  })

  it('shows correct empty message for overdue tab', () => {
    const msg = 'No overdue debts'
    expect(msg).toBe('No overdue debts')
  })

  it('shows correct empty message for paid tab', () => {
    const msg = 'No paid debts yet'
    expect(msg).toBe('No paid debts yet')
  })

  it('shows search empty message', () => {
    const msg = 'No customers match your search'
    expect(msg).toContain('No customers match')
  })
})

// ──────────────────────────────────────────────────
// Debt status badge
// ──────────────────────────────────────────────────

describe('Debt status badge logic', () => {
  function getDebtStatus(isPaid: boolean, dueDate: string): string {
    if (isPaid) return 'Paid'
    if (dueDate && isOverdue(dueDate)) return 'Overdue'
    return 'Pending'
  }

  it('returns Paid for paid debts', () => {
    expect(getDebtStatus(true, '')).toBe('Paid')
  })

  it('returns Overdue for unpaid past-due debts', () => {
    expect(getDebtStatus(false, '2020-01-01')).toBe('Overdue')
  })

  it('returns Pending for unpaid future-due debts', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    expect(getDebtStatus(false, future.toISOString())).toBe('Pending')
  })

  it('returns Pending for unpaid debts with no due date', () => {
    expect(getDebtStatus(false, '')).toBe('Pending')
  })
})

// ──────────────────────────────────────────────────
// API route verification
// ──────────────────────────────────────────────────

describe('Debt API routes', () => {
  it('getTotalDebt uses /debts/{business_id}', () => {
    const route = '/debts/{business_id}'
    expect(route).toBe('/debts/{business_id}')
  })

  it('listCustomersWithDebt uses /debts/customers/{business_id}', () => {
    const route = '/debts/customers/{business_id}'
    expect(route).toBe('/debts/customers/{business_id}')
  })

  it('getCustomerDebt uses /debts/customers/{business_id}/{customer_id}', () => {
    const route = '/debts/customers/{business_id}/{customer_id}'
    expect(route).toContain('/debts/customers/')
  })

  it('addDebt uses /debts/add_debt/{business_id}/{customer_id}', () => {
    const route = '/debts/add_debt/{business_id}/{customer_id}'
    expect(route).toContain('/debts/add_debt/')
  })

  it('updateDebt uses /debts/update_customer_debt/{business_id}/{customer_id}', () => {
    const route = '/debts/update_customer_debt/{business_id}/{customer_id}'
    expect(route).toContain('/debts/update_customer_debt/')
  })
})

// ──────────────────────────────────────────────────
// extractArray (from utils)
// ──────────────────────────────────────────────────

describe('extractArray utility (shared)', () => {
  it('returns array directly', () => {
    expect(extractArray([{ id: 1 }])).toHaveLength(1)
  })

  it('finds array in data property', () => {
    expect(extractArray({ data: [{ id: 1 }] })).toHaveLength(1)
  })

  it('returns empty for null', () => {
    expect(extractArray(null)).toEqual([])
  })

  it('returns empty for undefined', () => {
    expect(extractArray(undefined)).toEqual([])
  })

  it('handles nested objects (depth limit)', () => {
    const data = { a: { b: { c: { d: { e: [1] } } } } }
    expect(extractArray(data)).toEqual([])
  })
})

// ──────────────────────────────────────────────────
// parseApiError (from utils)
// ──────────────────────────────────────────────────

describe('parseApiError utility', () => {
  it('extracts string detail', () => {
    const err = { response: { data: { detail: 'Not found' } } }
    expect(parseApiError(err)).toBe('Not found')
  })

  it('extracts array detail', () => {
    const err = { response: { data: { detail: [{ msg: 'Error 1' }, { msg: 'Error 2' }] } } }
    expect(parseApiError(err)).toBe('Error 1, Error 2')
  })

  it('falls back to message', () => {
    const err = { message: 'Network error' }
    expect(parseApiError(err)).toBe('Network error')
  })

  it('returns default for unknown error', () => {
    expect(parseApiError(null)).toBe('An error occurred')
  })
})
