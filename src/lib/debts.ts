import { compareDateKeys, daysUntilDateKey } from './dates'
import type { Debtor, DebtRecord, DebtSummary } from './types'

export type DebtTab = 'all' | 'overdue' | 'paid'
export type DebtSort = 'highest' | 'lowest' | 'oldest'
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+'
export type DebtorStatus = 'overdue' | 'pending' | 'paid'
export type AgingFilter = AgingBucket | 'all'

/** Stable display order for the aging strip, current → oldest. */
export const AGING_BUCKETS: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+']

export const AGING_LABELS: Record<AgingBucket, string> = {
  current: 'Current',
  '1-30': '1–30 days',
  '31-60': '31–60 days',
  '61-90': '61–90 days',
  '90+': '90+ days',
}

export interface AgingBucketSummary {
  amount: number
  debts: number
  customers: number
}

export type AgingSummary = Record<AgingBucket, AgingBucketSummary>

export interface DueSoonSummary {
  amount: number
  debts: number
  customers: number
}

export function isOverdue(dueDate?: string | null, now?: Date): boolean {
  const days = daysUntilDateKey(dueDate, now)
  return days != null && days < 0
}

export function daysUntilDue(dueDate?: string | null, now?: Date): number {
  return daysUntilDateKey(dueDate, now) ?? 0
}

export function daysOverdue(dueDate?: string | null, now?: Date): number {
  const days = daysUntilDateKey(dueDate, now)
  return days != null && days < 0 ? -days : 0
}

export function agingBucket(dueDate?: string | null, now?: Date): AgingBucket {
  const days = daysUntilDateKey(dueDate, now)
  if (days == null || days >= 0) return 'current'
  const overdueBy = -days
  if (overdueBy <= 30) return '1-30'
  if (overdueBy <= 60) return '31-60'
  if (overdueBy <= 90) return '61-90'
  return '90+'
}

export function isSettled(debtor: Pick<Debtor, 'total_debt'>): boolean {
  return debtor.total_debt <= 0
}

export function hasOverdueDebt(debtor: Pick<Debtor, 'debts'>, now?: Date): boolean {
  return debtor.debts.some((debt) => !debt.is_paid && isOverdue(debt.due_date, now))
}

export function oldestDebtDate(debtor: Pick<Debtor, 'debts'>): string {
  let oldest = ''
  for (const debt of debtor.debts) {
    if (debt.is_paid || !debt.due_date) continue
    if (!oldest || compareDateKeys(debt.due_date, oldest) < 0) oldest = debt.due_date
  }
  return oldest
}

export function debtorStatus(debtor: Pick<Debtor, 'total_debt' | 'debts'>, now?: Date): DebtorStatus {
  if (isSettled(debtor)) return 'paid'
  return hasOverdueDebt(debtor, now) ? 'overdue' : 'pending'
}

/** Open (unpaid) debts for one customer, oldest due date first. */
export function openDebts(debtor: Pick<Debtor, 'debts'>): DebtRecord[] {
  return debtor.debts
    .filter((debt) => !debt.is_paid)
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return compareDateKeys(a.due_date, b.due_date)
    })
}

/** Outstanding balances grouped by how long they have been due. */
export function summarizeAging(debtors: Debtor[], now?: Date): AgingSummary {
  const summary = AGING_BUCKETS.reduce((acc, bucket) => {
    acc[bucket] = { amount: 0, debts: 0, customers: 0 }
    return acc
  }, {} as AgingSummary)

  for (const debtor of debtors) {
    const bucketsForCustomer = new Set<AgingBucket>()
    for (const debt of debtor.debts) {
      if (debt.is_paid) continue
      const bucket = agingBucket(debt.due_date, now)
      summary[bucket].amount += Number(debt.amount || 0)
      summary[bucket].debts += 1
      bucketsForCustomer.add(bucket)
    }
    bucketsForCustomer.forEach((bucket) => {
      summary[bucket].customers += 1
    })
  }

  return summary
}

/** Unpaid debts falling due within the next `withinDays` days (overdue excluded). */
export function summarizeDueSoon(debtors: Debtor[], withinDays = 7, now?: Date): DueSoonSummary {
  const summary: DueSoonSummary = { amount: 0, debts: 0, customers: 0 }

  for (const debtor of debtors) {
    let matched = false
    for (const debt of debtor.debts) {
      if (debt.is_paid) continue
      const days = daysUntilDateKey(debt.due_date, now)
      if (days == null || days < 0 || days > withinDays) continue
      summary.amount += Number(debt.amount || 0)
      summary.debts += 1
      matched = true
    }
    if (matched) summary.customers += 1
  }

  return summary
}

/** Keep debtors with at least one unpaid debt in the selected aging bucket. */
export function filterDebtorsByAging(debtors: Debtor[], filter: AgingFilter, now?: Date): Debtor[] {
  if (filter === 'all') return debtors
  return debtors.filter((debtor) =>
    debtor.debts.some((debt) => !debt.is_paid && agingBucket(debt.due_date, now) === filter)
  )
}

export function summarizeDebts(debtors: Debtor[], now?: Date): DebtSummary {
  let totalOutstanding = 0
  let totalCustomers = 0
  let totalOverdue = 0
  let overdueAmount = 0

  for (const debtor of debtors) {
    if (debtor.total_debt > 0) {
      totalOutstanding += debtor.total_debt
      totalCustomers++
    }
    for (const debt of debtor.debts) {
      if (!debt.is_paid && isOverdue(debt.due_date, now)) {
        totalOverdue++
        overdueAmount += Number(debt.amount || 0)
      }
    }
  }

  return {
    total_outstanding: totalOutstanding,
    total_customers: totalCustomers,
    total_overdue: totalOverdue,
    overdue_amount: overdueAmount,
  }
}

export function filterDebtors(debtors: Debtor[], tab: DebtTab, search = '', now?: Date): Debtor[] {
  const query = search.trim().toLowerCase()
  const base =
    tab === 'paid'
      ? debtors.filter((debtor) => isSettled(debtor))
      : debtors.filter((debtor) => debtor.total_debt > 0)

  const byTab = tab === 'overdue' ? base.filter((debtor) => hasOverdueDebt(debtor, now)) : base
  if (!query) return byTab

  return byTab.filter((debtor) => {
    const name = (debtor.customer_name || '').toLowerCase()
    const email = (debtor.customer_email || '').toLowerCase()
    const phone = debtor.customer_phone || ''
    return name.includes(query) || email.includes(query) || phone.includes(query)
  })
}

export function sortDebtors(debtors: Debtor[], sort: DebtSort): Debtor[] {
  const copy = [...debtors]
  if (sort === 'highest') return copy.sort((a, b) => b.total_debt - a.total_debt)
  if (sort === 'lowest') return copy.sort((a, b) => a.total_debt - b.total_debt)

  return copy.sort((a, b) => {
    const aDate = oldestDebtDate(a) || a.debts[0]?.created_at || ''
    const bDate = oldestDebtDate(b) || b.debts[0]?.created_at || ''
    if (!aDate && !bDate) return 0
    if (!aDate) return 1
    if (!bDate) return -1
    return compareDateKeys(aDate, bDate)
  })
}

export function aggregateDebtRows(rows: unknown[]): Debtor[] {
  const customerMap = new Map<number, Debtor>()

  for (const entry of rows || []) {
    const item = (entry ?? {}) as Record<string, any>
    const debt = (item.debt ?? item) as Record<string, any>
    const customerId = Number(debt.customer_id ?? item.customer_id ?? item.user_id ?? item.id)
    if (!customerId) continue

    const debtId = debt.debt_id ?? debt.id
    const amount = Number(
      debt.amount ?? debt.customer_debt ?? debt.total_debt ?? item.customer_debt ?? item.amount ?? 0
    )
    const isPaid = debt.is_paid != null ? Boolean(debt.is_paid) : amount <= 0

    let debtor = customerMap.get(customerId)
    if (!debtor) {
      debtor = {
        customer_id: customerId,
        customer_name: item.customer_name ?? item.name ?? `Customer #${customerId}`,
        customer_email: item.customer_email ?? item.email ?? '',
        customer_phone: item.customer_phone ?? item.phone ?? '',
        total_debt: 0,
        debts: [],
      }
      customerMap.set(customerId, debtor)
    }

    if (!isPaid) debtor.total_debt += amount

    if (debtId) {
      const record: DebtRecord = {
        debt_id: Number(debtId),
        sale_id: debt.sale_id ?? undefined,
        amount,
        due_date: debt.due_date || '',
        is_paid: isPaid,
        created_at: debt.created_at || '',
        note: debt.note || undefined,
      }
      debtor.debts.push(record)
    }
  }

  return Array.from(customerMap.values())
}
