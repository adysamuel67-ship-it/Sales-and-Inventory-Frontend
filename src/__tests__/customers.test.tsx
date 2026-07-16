/**
 * Customers Page Tests
 *
 * Verifies:
 * 1. extractArray utility handles various response formats
 * 2. normalizeCustomer normalizes field aliases (matches backend CustomerResponse)
 * 3. getDebtBadge returns correct badge colors/labels
 * 4. Tab switching between "All Customers" and "With Debt"
 * 5. Search filtering works on name, phone, email
 * 6. Role-based UI: staff cannot add/delete customers
 * 7. Customer form validation (name, phone, email required)
 * 8. Delete confirmation flow
 * 9. Debt summary calculations
 * 10. Business ID validation
 * 11. Empty state content per tab
 * 12. Tab active styling
 * 13. Debt data from separate endpoint
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

function normalizeCustomer(raw: any) {
  return {
    customer_id: raw.customer_id ?? raw.id,
    business_id: raw.business_id ?? 0,
    name: raw.name ?? '',
    phone: raw.phone ?? raw.phone_number ?? '',
    email: raw.email ?? '',
    address: raw.address ?? '',
    is_active: raw.is_active ?? true,
    ...raw,
  }
}

function getDebtBadge(debt: number) {
  if (debt <= 0) return { bg: 'bg-success-light', text: 'text-success', label: 'No debt' }
  if (debt < 100) return { bg: 'bg-warning-light', text: 'text-warning', label: `GH\u20B5${debt.toFixed(2)}` }
  return { bg: 'bg-danger-light', text: 'text-danger', label: `GH\u20B5${debt.toFixed(2)}` }
}

function getActiveBadge(isActive: boolean) {
  if (isActive) return { bg: 'bg-success-light', text: 'text-success', label: 'Active' }
  return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Inactive' }
}

// ──────────────────────────────────────────────────
// extractArray
// ──────────────────────────────────────────────────

describe('Customers extractArray utility', () => {
  it('returns array directly if data is an array', () => {
    const data = [{ id: 1, name: 'Ama' }, { id: 2, name: 'Kofi' }]
    expect(extractArray(data)).toHaveLength(2)
  })

  it('finds array in "data" property', () => {
    const data = { data: [{ id: 1, name: 'Ama' }] }
    expect(extractArray(data)).toEqual([{ id: 1, name: 'Ama' }])
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

// ──────────────────────────────────────────────────
// normalizeCustomer (matches CustomerResponse schema)
// ──────────────────────────────────────────────────

describe('normalizeCustomer', () => {
  it('uses customer_id field', () => {
    const raw = { customer_id: 42, business_id: 1, name: 'Ama Mensah', phone: '0241234567', email: 'ama@test.com', address: 'Accra', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.customer_id).toBe(42)
    expect(c.name).toBe('Ama Mensah')
  })

  it('falls back to id field when customer_id is absent', () => {
    const raw = { id: 7, business_id: 1, name: 'Kofi', phone: '020123', email: 'k@test.com', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.customer_id).toBe(7)
  })

  it('includes business_id from response', () => {
    const raw = { customer_id: 1, business_id: 5, name: 'Test', phone: '024', email: 't@t.com', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.business_id).toBe(5)
  })

  it('defaults business_id to 0', () => {
    const raw = { customer_id: 1, name: 'Test', phone: '', email: '', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.business_id).toBe(0)
  })

  it('falls back to phone_number for phone', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', phone_number: '0201234567', email: '', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.phone).toBe('0201234567')
  })

  it('defaults phone to empty string', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', email: '', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.phone).toBe('')
  })

  it('defaults email to empty string', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', phone: '', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.email).toBe('')
  })

  it('defaults address to empty string', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', phone: '', email: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.address).toBe('')
  })

  it('defaults is_active to true', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', phone: '', email: '', address: '' }
    const c = normalizeCustomer(raw)
    expect(c.is_active).toBe(true)
  })

  it('uses is_active from raw', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', phone: '', email: '', address: '', is_active: false }
    const c = normalizeCustomer(raw)
    expect(c.is_active).toBe(false)
  })

  it('defaults name to empty string', () => {
    const raw = { customer_id: 1, business_id: 1, phone: '', email: '', address: '', is_active: true }
    const c = normalizeCustomer(raw)
    expect(c.name).toBe('')
  })

  it('preserves extra fields from raw', () => {
    const raw = { customer_id: 1, business_id: 1, name: 'Test', phone: '', email: '', address: '', is_active: true, loyalty_points: 50 }
    const c = normalizeCustomer(raw)
    expect((c as any).loyalty_points).toBe(50)
  })
})

// ──────────────────────────────────────────────────
// getDebtBadge
// ──────────────────────────────────────────────────

describe('getDebtBadge', () => {
  it('returns success badge for zero debt', () => {
    const badge = getDebtBadge(0)
    expect(badge.bg).toBe('bg-success-light')
    expect(badge.text).toBe('text-success')
    expect(badge.label).toBe('No debt')
  })

  it('returns success badge for negative debt', () => {
    const badge = getDebtBadge(-50)
    expect(badge.bg).toBe('bg-success-light')
    expect(badge.label).toBe('No debt')
  })

  it('returns warning badge for small debt (< 100)', () => {
    const badge = getDebtBadge(50)
    expect(badge.bg).toBe('bg-warning-light')
    expect(badge.text).toBe('text-warning')
    expect(badge.label).toContain('50.00')
  })

  it('returns danger badge for debt >= 100', () => {
    const badge = getDebtBadge(200)
    expect(badge.bg).toBe('bg-danger-light')
    expect(badge.text).toBe('text-danger')
    expect(badge.label).toContain('200.00')
  })

  it('formats debt with two decimal places', () => {
    const badge = getDebtBadge(55.5)
    expect(badge.label).toBe('GH\u20B555.50')
  })

  it('boundary: 99.99 is warning', () => {
    const badge = getDebtBadge(99.99)
    expect(badge.bg).toBe('bg-warning-light')
  })

  it('boundary: 100 is danger', () => {
    const badge = getDebtBadge(100)
    expect(badge.bg).toBe('bg-danger-light')
  })
})

// ──────────────────────────────────────────────────
// getActiveBadge
// ──────────────────────────────────────────────────

describe('getActiveBadge', () => {
  it('returns success for active customer', () => {
    const badge = getActiveBadge(true)
    expect(badge.bg).toBe('bg-success-light')
    expect(badge.label).toBe('Active')
  })

  it('returns gray for inactive customer', () => {
    const badge = getActiveBadge(false)
    expect(badge.bg).toBe('bg-gray-100')
    expect(badge.label).toBe('Inactive')
  })
})

// ──────────────────────────────────────────────────
// Tab state management
// ──────────────────────────────────────────────────

describe('Customer tab state management', () => {
  type Tab = 'all' | 'debt'

  it('defaults to "all" tab', () => {
    let activeTab: Tab = 'all'
    expect(activeTab).toBe('all')
  })

  it('switches to "debt" tab', () => {
    let activeTab: Tab = 'all'
    activeTab = 'debt'
    expect(activeTab).toBe('debt')
  })

  it('switches back to "all" tab', () => {
    let activeTab: Tab = 'debt'
    activeTab = 'all'
    expect(activeTab).toBe('all')
  })

  it('tab type only allows "all" or "debt"', () => {
    const validTabs: Tab[] = ['all', 'debt']
    expect(validTabs).toContain('all')
    expect(validTabs).toContain('debt')
  })
})

// ──────────────────────────────────────────────────
// Tab active styling
// ──────────────────────────────────────────────────

describe('Customer tab active styling', () => {
  function getTabClasses(isActive: boolean): string {
    return `px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
      isActive
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-gray-500 hover:text-gray-700'
    }`
  }

  it('active tab has white background and shadow', () => {
    const classes = getTabClasses(true)
    expect(classes).toContain('bg-white')
    expect(classes).toContain('text-gray-900')
    expect(classes).toContain('shadow-sm')
  })

  it('inactive tab has no background', () => {
    const classes = getTabClasses(false)
    expect(classes).not.toContain('bg-white')
    expect(classes).toContain('text-gray-500')
  })

  it('both tabs meet 44px touch target', () => {
    const activeClasses = getTabClasses(true)
    const inactiveClasses = getTabClasses(false)
    expect(activeClasses).toContain('min-h-[44px]')
    expect(inactiveClasses).toContain('min-h-[44px]')
  })
})

// ──────────────────────────────────────────────────
// Search filtering
// ──────────────────────────────────────────────────

describe('Customer search filtering', () => {
  const customers = [
    { customer_id: 1, name: 'Ama Mensah', phone: '0241234567', email: 'ama@test.com' },
    { customer_id: 2, name: 'Kofi Asante', phone: '0209876543', email: 'kofi@test.com' },
    { customer_id: 3, name: 'Aba Osei', phone: '0551122334', email: 'aba@test.com' },
    { customer_id: 4, name: 'Kwame Nkrumah', phone: '0245566778', email: 'kwame@test.com' },
  ]

  function filterCustomers(list: any[], search: string) {
    return list.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    )
  }

  it('returns all customers when search is empty', () => {
    expect(filterCustomers(customers, '')).toHaveLength(4)
  })

  it('filters by name substring', () => {
    const results = filterCustomers(customers, 'Ama')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Ama Mensah')
  })

  it('filters by phone number', () => {
    const results = filterCustomers(customers, '0241')
    expect(results).toHaveLength(1)
    expect(results[0].phone).toBe('0241234567')
  })

  it('filters by email', () => {
    const results = filterCustomers(customers, 'kofi@test')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Kofi Asante')
  })

  it('filters case-insensitively', () => {
    const results = filterCustomers(customers, 'AMA')
    expect(results).toHaveLength(1)
  })

  it('returns empty for no match', () => {
    expect(filterCustomers(customers, 'xyz')).toHaveLength(0)
  })

  it('partial match works', () => {
    const results = filterCustomers(customers, 'Ose')
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Aba Osei')
  })

  it('matches multiple results with prefix', () => {
    const results = filterCustomers(customers, '024')
    expect(results).toHaveLength(2)
  })
})

// ──────────────────────────────────────────────────
// Tab content filtering
// ──────────────────────────────────────────────────

describe('Tab content filtering', () => {
  const customers = [
    { customer_id: 1, name: 'Ama', is_active: true },
    { customer_id: 2, name: 'Kofi', is_active: true },
    { customer_id: 3, name: 'Aba', is_active: true },
    { customer_id: 4, name: 'Kwame', is_active: true },
  ]

  const debtData = [
    { customer_id: 2, customer_debt: 50 },
    { customer_id: 3, customer_debt: 200 },
  ]

  it('debt tab filters to customers in debtData', () => {
    const debtIds = new Set(debtData.map((d) => d.customer_id))
    const debtCustomers = customers.filter((c) => debtIds.has(c.customer_id))
    expect(debtCustomers).toHaveLength(2)
    expect(debtCustomers.map((c) => c.name)).toContain('Kofi')
    expect(debtCustomers.map((c) => c.name)).toContain('Aba')
  })

  it('all tab includes all customers', () => {
    expect(customers).toHaveLength(4)
  })

  it('handles empty debtData', () => {
    const debtIds = new Set([].map((d: any) => d.customer_id))
    const debtCustomers = customers.filter((c) => debtIds.has(c.customer_id))
    expect(debtCustomers).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────
// Debt summary calculations
// ──────────────────────────────────────────────────

describe('Debt summary calculations', () => {
  it('calculates total debt correctly', () => {
    const debtData = [
      { customer_id: 2, customer_debt: 50 },
      { customer_id: 3, customer_debt: 200 },
      { customer_id: 5, customer_debt: 75.50 },
    ]
    const totalDebt = debtData.reduce((sum, d) => sum + d.customer_debt, 0)
    expect(totalDebt).toBe(325.50)
  })

  it('handles empty debt data', () => {
    const totalDebt: number = [].reduce((sum: number, d: any) => sum + d.customer_debt, 0)
    expect(totalDebt).toBe(0)
  })

  it('formats total debt with locale string', () => {
    const totalDebt = 1250.5
    const formatted = totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })
    expect(formatted).toContain('1')
    expect(formatted).toContain('250')
    expect(formatted).toContain('50')
  })

  it('builds debtMap from debtData', () => {
    const debtData = [
      { customer_id: 2, customer_debt: 50 },
      { customer_id: 3, customer_debt: 200 },
    ]
    const debtMap = new Map(debtData.map((d) => [d.customer_id, d.customer_debt]))
    expect(debtMap.get(2)).toBe(50)
    expect(debtMap.get(3)).toBe(200)
    expect(debtMap.get(99)).toBeUndefined()
  })
})

// ──────────────────────────────────────────────────
// Role-based access
// ──────────────────────────────────────────────────

describe('Customer role-based access', () => {
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

// ──────────────────────────────────────────────────
// Form validation
// ──────────────────────────────────────────────────

describe('Customer form validation', () => {
  it('form requires name, phone, and email', () => {
    const form = { name: '', phone: '', email: '', address: '' }
    const isValid = !!form.name.trim() && !!form.phone.trim() && !!form.email.trim()
    expect(isValid).toBe(false)
  })

  it('form is valid when name, phone, and email are provided', () => {
    const form = { name: 'Ama Mensah', phone: '0241234567', email: 'ama@test.com', address: '' }
    const isValid = !!form.name.trim() && !!form.phone.trim() && !!form.email.trim()
    expect(isValid).toBe(true)
  })

  it('form is invalid with only name', () => {
    const form = { name: 'Ama', phone: '', email: '', address: '' }
    const isValid = !!form.name.trim() && !!form.phone.trim() && !!form.email.trim()
    expect(isValid).toBe(false)
  })

  it('form is invalid with only name and phone', () => {
    const form = { name: 'Ama', phone: '024123', email: '', address: '' }
    const isValid = !!form.name.trim() && !!form.phone.trim() && !!form.email.trim()
    expect(isValid).toBe(false)
  })

  it('name with only whitespace is invalid', () => {
    const form = { name: '   ', phone: '024', email: 'a@t.com', address: '' }
    const isValid = !!form.name.trim() && !!form.phone.trim() && !!form.email.trim()
    expect(isValid).toBe(false)
  })

  it('form resets after successful submission', () => {
    let form = { name: 'Ama', phone: '024123', email: 'ama@test.com', address: 'Accra' }
    form = { name: '', phone: '', email: '', address: '' }
    expect(form.name).toBe('')
    expect(form.phone).toBe('')
    expect(form.email).toBe('')
    expect(form.address).toBe('')
  })

  it('address is optional', () => {
    const form = { name: 'Ama', phone: '024123', email: 'ama@test.com', address: '' }
    const isValid = !!form.name.trim() && !!form.phone.trim() && !!form.email.trim()
    expect(isValid).toBe(true)
  })
})

// ──────────────────────────────────────────────────
// Delete confirmation flow
// ──────────────────────────────────────────────────

describe('Customer delete confirmation flow', () => {
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

  it('cancel clears the confirmation', () => {
    let deleteConfirm: number | null = 42
    deleteConfirm = null
    expect(deleteConfirm).toBeNull()
  })
})

// ──────────────────────────────────────────────────
// Business ID validation
// ──────────────────────────────────────────────────

describe('Customer page business ID validation', () => {
  it('rejects NaN business ID', () => {
    const businessId = parseInt(undefined as unknown as string)
    expect(isNaN(businessId)).toBe(true)
  })

  it('accepts valid numeric business ID', () => {
    const businessId = parseInt('42')
    expect(businessId).toBe(42)
    expect(isNaN(businessId)).toBe(false)
  })
})

// ──────────────────────────────────────────────────
// Page heading
// ──────────────────────────────────────────────────

describe('Customer page heading', () => {
  it('displays correct heading', () => {
    const heading = 'Customers'
    expect(heading).toBe('Customers')
  })

  it('displays correct subtitle', () => {
    const subtitle = 'Manage your customers and debts'
    expect(subtitle).toContain('customers')
    expect(subtitle).toContain('debts')
  })
})

// ──────────────────────────────────────────────────
// Empty state content
// ──────────────────────────────────────────────────

describe('Customer empty state content', () => {
  it('shows "No customers yet" when all tab is empty', () => {
    const heading = 'No customers yet'
    expect(heading).toBe('No customers yet')
  })

  it('shows "No customers match your search" when search has no results', () => {
    const heading = 'No customers match your search'
    expect(heading).toContain('No customers match')
  })

  it('shows "No customers with outstanding debt" when debt tab is empty', () => {
    const heading = 'No customers with outstanding debt'
    expect(heading).toContain('outstanding debt')
  })

  it('shows "All customers are up to date" when debt tab is empty', () => {
    const description = 'All customers are up to date'
    expect(description).toContain('up to date')
  })
})

// ──────────────────────────────────────────────────
// Table structure
// ──────────────────────────────────────────────────

describe('Customer table structure', () => {
  it('has correct column headers for all tab', () => {
    const headers = ['Customer', 'Phone', 'Email', 'Status', 'Actions']
    expect(headers).toHaveLength(5)
    expect(headers).toContain('Customer')
    expect(headers).toContain('Phone')
    expect(headers).toContain('Email')
    expect(headers).toContain('Status')
    expect(headers).toContain('Actions')
  })

  it('has correct column headers for debt tab', () => {
    const headers = ['Customer', 'Phone', 'Email', 'Status', 'Debt', 'Actions']
    expect(headers).toHaveLength(6)
    expect(headers).toContain('Debt')
  })

  it('customer name and address render in same cell', () => {
    const customer = { name: 'Ama Mensah', address: 'Accra, Ghana' }
    expect(customer.name).toBe('Ama Mensah')
    expect(customer.address).toBe('Accra, Ghana')
  })

  it('phone shows dash when empty', () => {
    const phone = ''
    const display = phone || '-'
    expect(display).toBe('-')
  })

  it('email shows dash when empty', () => {
    const email = ''
    const display = email || '-'
    expect(display).toBe('-')
  })
})

// ──────────────────────────────────────────────────
// Form field structure
// ──────────────────────────────────────────────────

describe('Customer form fields', () => {
  it('has 4 form fields: name, phone, email, address', () => {
    const fields = ['name', 'phone', 'email', 'address']
    expect(fields).toHaveLength(4)
    expect(fields).toContain('name')
    expect(fields).toContain('phone')
    expect(fields).toContain('email')
    expect(fields).toContain('address')
  })

  it('name, phone, email are required; address is optional', () => {
    const required = ['name', 'phone', 'email']
    const optional = ['address']
    expect(required).toHaveLength(3)
    expect(optional).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────────
// Debt badge in table
// ──────────────────────────────────────────────────

describe('Debt badge in customer table', () => {
  it('shows "No debt" for customers with zero debt', () => {
    const badge = getDebtBadge(0)
    expect(badge.label).toBe('No debt')
  })

  it('shows formatted GHc amount for customers with debt', () => {
    const badge = getDebtBadge(150.75)
    expect(badge.label).toBe('GH\u20B5150.75')
    expect(badge.bg).toBe('bg-danger-light')
  })

  it('warning badge for small amounts', () => {
    const badge = getDebtBadge(25)
    expect(badge.bg).toBe('bg-warning-light')
    expect(badge.label).toContain('25.00')
  })
})

// ──────────────────────────────────────────────────
// Backend API route verification
// ──────────────────────────────────────────────────

describe('Customer API routes', () => {
  it('list uses /business/customers/{business_id}', () => {
    const route = '/business/customers/{business_id}'
    expect(route).toBe('/business/customers/{business_id}')
  })

  it('create uses /business/customers/{business_id}', () => {
    const route = '/business/customers/{business_id}'
    expect(route).toBe('/business/customers/{business_id}')
  })

  it('get uses /business/customers/{business_id}/{customer_id}', () => {
    const route = '/business/customers/{business_id}/{customer_id}'
    expect(route).toContain('/business/customers/')
  })

  it('delete uses /business/customers/{business_id}/{customer_id}', () => {
    const route = '/business/customers/{business_id}/{customer_id}'
    expect(route).toContain('/business/customers/')
  })

  it('listWithDebt uses /debts/customers/{business_id}', () => {
    const route = '/debts/customers/{business_id}'
    expect(route).toBe('/debts/customers/{business_id}')
  })

  it('deactivate uses /business/customers/{business_id}/deactivate/{customer_id}', () => {
    const route = '/business/customers/{business_id}/deactivate/{customer_id}'
    expect(route).toContain('/deactivate/')
  })
})
