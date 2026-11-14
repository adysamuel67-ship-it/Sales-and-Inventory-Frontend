import {
  AGING_BUCKETS,
  aggregateDebtRows,
  agingBucket,
  daysOverdue,
  daysUntilDue,
  debtorStatus,
  filterDebtors,
  filterDebtorsByAging,
  hasOverdueDebt,
  isOverdue,
  isSettled,
  oldestDebtDate,
  openDebts,
  sortDebtors,
  summarizeAging,
  summarizeDebts,
  summarizeDueSoon,
} from '@/lib/debts'
import type { Debtor } from '@/lib/types'

const NOW = new Date('2026-06-15T12:00:00Z')

function debtor(overrides: Partial<Debtor> = {}): Debtor {
  return {
    customer_id: 1,
    customer_name: 'Ama',
    customer_email: 'ama@example.com',
    customer_phone: '0244000000',
    total_debt: 0,
    debts: [],
    ...overrides,
  }
}

function debt(overrides: Partial<Debtor['debts'][number]> = {}): Debtor['debts'][number] {
  return {
    debt_id: 1,
    amount: 100,
    due_date: '2026-06-20',
    is_paid: false,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('debt date helpers', () => {
  it('treats a due date before today as overdue and today as not', () => {
    expect(isOverdue('2026-06-14', NOW)).toBe(true)
    expect(isOverdue('2026-06-15', NOW)).toBe(false)
    expect(isOverdue('2026-06-16', NOW)).toBe(false)
    expect(isOverdue(null, NOW)).toBe(false)
    expect(isOverdue('', NOW)).toBe(false)
    expect(isOverdue('not-a-date', NOW)).toBe(false)
  })

  it('counts days until due and days overdue', () => {
    expect(daysUntilDue('2026-06-15', NOW)).toBe(0)
    expect(daysUntilDue('2026-06-18', NOW)).toBe(3)
    expect(daysUntilDue('2026-06-10', NOW)).toBe(-5)
    expect(daysUntilDue(undefined, NOW)).toBe(0)

    expect(daysOverdue('2026-06-10', NOW)).toBe(5)
    expect(daysOverdue('2026-06-20', NOW)).toBe(0)
  })

  it('buckets overdue age', () => {
    expect(agingBucket('2026-06-15', NOW)).toBe('current')
    expect(agingBucket('2026-06-20', NOW)).toBe('current')
    expect(agingBucket('2026-06-14', NOW)).toBe('1-30')
    expect(agingBucket('2026-05-16', NOW)).toBe('1-30')
    expect(agingBucket('2026-05-15', NOW)).toBe('31-60')
    expect(agingBucket('2026-04-15', NOW)).toBe('61-90')
    expect(agingBucket('2026-03-01', NOW)).toBe('90+')
  })
})

describe('aggregateDebtRows', () => {
  it('keeps paid debts as records but excludes them from the balance', () => {
    const [result] = aggregateDebtRows([
      { customer_name: 'Ama', debt: { debt_id: 1, customer_id: 7, amount: 100, is_paid: false } },
      { customer_name: 'Ama', debt: { debt_id: 2, customer_id: 7, amount: 250, is_paid: true } },
    ])

    expect(result.customer_id).toBe(7)
    expect(result.total_debt).toBe(100)
    expect(result.debts).toHaveLength(2)
    expect(result.debts[1].is_paid).toBe(true)
  })

  it('sums multiple unpaid debts for the same customer', () => {
    const [result] = aggregateDebtRows([
      { debt: { debt_id: 1, customer_id: 3, amount: 40 } },
      { debt: { debt_id: 2, customer_id: 3, amount: 60 } },
    ])

    expect(result.total_debt).toBe(100)
    expect(result.debts.map((d) => d.debt_id)).toEqual([1, 2])
  })

  it('supports flat rows and amount fallbacks', () => {
    const [result] = aggregateDebtRows([
      { customer_id: 9, name: 'Kofi', phone: '0200', total_debt: 75, debt_id: 4 },
    ])

    expect(result.customer_name).toBe('Kofi')
    expect(result.customer_phone).toBe('0200')
    expect(result.total_debt).toBe(75)
    expect(result.debts[0]).toMatchObject({ debt_id: 4, amount: 75 })
  })

  it('ignores rows without a customer id', () => {
    expect(aggregateDebtRows([{ amount: 50 }, null, undefined])).toEqual([])
  })

  it('returns settled customers with zero balance rather than dropping them', () => {
    const [result] = aggregateDebtRows([
      { customer_name: 'Yaa', debt: { debt_id: 5, customer_id: 11, amount: 0, is_paid: true } },
    ])

    expect(result.total_debt).toBe(0)
    expect(result.debts).toHaveLength(1)
  })
})

describe('summarizeDebts', () => {
  it('counts only unpaid balances and only overdue unpaid debts', () => {
    const summary = summarizeDebts(
      [
        debtor({
          total_debt: 150,
          debts: [
            debt({ debt_id: 1, amount: 100, due_date: '2026-06-01' }),
            debt({ debt_id: 2, amount: 50, due_date: '2026-06-30' }),
          ],
        }),
        debtor({
          customer_id: 2,
          total_debt: 0,
          debts: [debt({ debt_id: 3, amount: 300, due_date: '2026-01-01', is_paid: true })],
        }),
      ],
      NOW
    )

    expect(summary).toEqual({
      total_outstanding: 150,
      total_customers: 1,
      total_overdue: 1,
      overdue_amount: 100,
    })
  })
})

describe('filterDebtors', () => {
  const inDebt = debtor({ customer_id: 1, total_debt: 100, debts: [debt({ due_date: '2026-06-01' })] })
  const notYetDue = debtor({
    customer_id: 2,
    customer_name: 'Kofi',
    total_debt: 40,
    debts: [debt({ debt_id: 2, due_date: '2026-07-01' })],
  })
  const settled = debtor({
    customer_id: 3,
    customer_name: 'Yaa',
    total_debt: 0,
    debts: [debt({ debt_id: 3, is_paid: true })],
  })
  const all = [inDebt, notYetDue, settled]

  it('shows only unpaid customers in the all tab', () => {
    expect(filterDebtors(all, 'all', '', NOW).map((d) => d.customer_id)).toEqual([1, 2])
  })

  it('shows only settled customers in the paid tab', () => {
    expect(filterDebtors(all, 'paid', '', NOW).map((d) => d.customer_id)).toEqual([3])
  })

  it('shows only genuinely overdue customers in the overdue tab', () => {
    expect(filterDebtors(all, 'overdue', '', NOW).map((d) => d.customer_id)).toEqual([1])
  })

  it('matches name, email and phone', () => {
    expect(filterDebtors(all, 'all', 'kofi', NOW)).toHaveLength(1)
    expect(filterDebtors(all, 'all', 'ama@example', NOW)).toHaveLength(2)
    expect(filterDebtors(all, 'all', '0244', NOW)).toHaveLength(2)
  })
})

describe('sortDebtors', () => {
  const newer = debtor({
    customer_id: 1,
    total_debt: 500,
    debts: [debt({ due_date: '2026-05-20', created_at: '2026-05-19T00:00:00Z' })],
  })
  const older = debtor({
    customer_id: 2,
    total_debt: 100,
    debts: [debt({ debt_id: 2, due_date: '2026-04-01', created_at: '2026-05-30T00:00:00Z' })],
  })
  const noDueDate = debtor({
    customer_id: 3,
    total_debt: 50,
    debts: [debt({ debt_id: 3, due_date: '', created_at: '2026-03-01T00:00:00Z' })],
  })

  it('sorts by amount', () => {
    expect(sortDebtors([newer, older, noDueDate], 'highest').map((d) => d.customer_id)).toEqual([1, 2, 3])
    expect(sortDebtors([newer, older, noDueDate], 'lowest').map((d) => d.customer_id)).toEqual([3, 2, 1])
  })

  it('sorts oldest by due date, falling back to created date', () => {
    expect(sortDebtors([newer, older, noDueDate], 'oldest').map((d) => d.customer_id)).toEqual([3, 2, 1])
  })

  it('uses the earliest unpaid due date and ignores paid debts', () => {
    const mixed = debtor({
      debts: [
        debt({ due_date: '2026-06-01', is_paid: true }),
        debt({ debt_id: 2, due_date: '2026-05-10' }),
        debt({ debt_id: 3, due_date: '2026-05-20' }),
      ],
    })

    expect(oldestDebtDate(mixed)).toBe('2026-05-10')
  })
})

describe('settled and overdue predicates', () => {
  it('detects settled balances', () => {
    expect(isSettled({ total_debt: 0 })).toBe(true)
    expect(isSettled({ total_debt: -5 })).toBe(true)
    expect(isSettled({ total_debt: 0.01 })).toBe(false)
  })

  it('detects whether a debtor has an overdue unpaid debt', () => {
    expect(hasOverdueDebt({ debts: [debt({ due_date: '2026-06-01' })] }, NOW)).toBe(true)
    expect(hasOverdueDebt({ debts: [debt({ due_date: '2026-06-01', is_paid: true })] }, NOW)).toBe(false)
    expect(hasOverdueDebt({ debts: [debt({ due_date: '2026-07-01' })] }, NOW)).toBe(false)
  })

  it('derives a single display status per debtor', () => {
    expect(debtorStatus(debtor({ total_debt: 0 }), NOW)).toBe('paid')
    expect(debtorStatus(debtor({ total_debt: 50, debts: [debt({ due_date: '2026-06-01' })] }), NOW)).toBe('overdue')
    expect(debtorStatus(debtor({ total_debt: 50, debts: [debt({ due_date: '2026-07-01' })] }), NOW)).toBe('pending')
  })

  it('lists open debts oldest first and drops paid ones', () => {
    const mixed = debtor({
      debts: [
        debt({ debt_id: 1, due_date: '2026-07-01' }),
        debt({ debt_id: 2, due_date: '2026-06-01', is_paid: true }),
        debt({ debt_id: 3, due_date: '2026-05-01' }),
      ],
    })
    expect(openDebts(mixed).map((d) => d.debt_id)).toEqual([3, 1])
  })
})

describe('aging summaries', () => {
  const all = [
    debtor({
      customer_id: 1,
      total_debt: 550,
      debts: [
        debt({ debt_id: 1, amount: 100, due_date: '2026-06-20' }),
        debt({ debt_id: 2, amount: 200, due_date: '2026-06-01' }),
        debt({ debt_id: 3, amount: 250, due_date: '2026-03-01' }),
      ],
    }),
    debtor({
      customer_id: 2,
      total_debt: 50,
      debts: [
        debt({ debt_id: 4, amount: 50, due_date: '2026-05-01' }),
        debt({ debt_id: 5, amount: 999, due_date: '2026-01-01', is_paid: true }),
      ],
    }),
  ]

  it('buckets amounts, debts and unique customers', () => {
    const summary = summarizeAging(all, NOW)
    expect(AGING_BUCKETS).toEqual(['current', '1-30', '31-60', '61-90', '90+'])
    expect(summary.current).toEqual({ amount: 100, debts: 1, customers: 1 })
    expect(summary['1-30']).toEqual({ amount: 200, debts: 1, customers: 1 })
    expect(summary['31-60']).toEqual({ amount: 50, debts: 1, customers: 1 })
    expect(summary['61-90']).toEqual({ amount: 0, debts: 0, customers: 0 })
    expect(summary['90+']).toEqual({ amount: 250, debts: 1, customers: 1 })
  })

  it('filters debtors by aging bucket', () => {
    expect(filterDebtorsByAging(all, 'current', NOW).map((d) => d.customer_id)).toEqual([1])
    expect(filterDebtorsByAging(all, '1-30', NOW).map((d) => d.customer_id)).toEqual([1])
    expect(filterDebtorsByAging(all, '31-60', NOW).map((d) => d.customer_id)).toEqual([2])
    expect(filterDebtorsByAging(all, '90+', NOW).map((d) => d.customer_id)).toEqual([1])
    expect(filterDebtorsByAging(all, '61-90', NOW)).toEqual([])
    expect(filterDebtorsByAging(all, 'all', NOW)).toHaveLength(2)
  })

  it('summarizes debts due in the next seven days', () => {
    const soon = summarizeDueSoon(all, 7, NOW)
    expect(soon).toEqual({ amount: 100, debts: 1, customers: 1 })

    expect(summarizeDueSoon(all, 0, NOW)).toEqual({ amount: 0, debts: 0, customers: 0 })
  })
})
