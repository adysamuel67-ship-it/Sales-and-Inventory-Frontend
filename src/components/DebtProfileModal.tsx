'use client'

import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import {
  BellIcon,
  CalendarIcon,
  CashIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  XIcon,
} from '@/components/ui/Icons'
import { formatCedi } from '@/lib/utils'
import { formatDateLabel } from '@/lib/dates'
import {
  daysOverdue,
  daysUntilDue,
  debtorStatus,
  isOverdue,
  openDebts,
  type DebtorStatus,
} from '@/lib/debts'
import type { Debtor, DebtPayment, DebtRecord } from '@/lib/types'

const STATUS_META: Record<DebtorStatus, { label: string; color: 'red' | 'amber' | 'emerald' }> = {
  overdue: { label: 'Overdue', color: 'red' },
  pending: { label: 'Pending', color: 'amber' },
  paid: { label: 'Settled', color: 'emerald' },
}

const AVATAR_TONE: Record<DebtorStatus, string> = {
  overdue: 'bg-rose-50 text-danger',
  pending: 'bg-amber-50 text-warning',
  paid: 'bg-emerald-50 text-success',
}

function dueLabel(dueDate?: string | null): string {
  if (!dueDate) return 'No due date'
  if (isOverdue(dueDate)) {
    const days = daysOverdue(dueDate)
    return `${days} day${days === 1 ? '' : 's'} overdue`
  }
  const days = daysUntilDue(dueDate)
  return days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`
}

export default function DebtProfileModal({
  customer,
  transactions,
  loading,
  canPayDebt,
  canRemind,
  onClose,
  onRecordPayment,
  onRemind,
  onViewDebt,
  onViewTransaction,
}: {
  customer: Debtor
  transactions: DebtPayment[]
  loading: boolean
  canPayDebt: boolean
  canRemind: boolean
  onClose: () => void
  onRecordPayment: () => void
  onRemind: (debtId?: number) => void
  onViewDebt: (debt: DebtRecord) => void
  onViewTransaction: (txn: DebtPayment) => void
}) {
  const status = debtorStatus(customer)
  const meta = STATUS_META[status]
  const unpaid = openDebts(customer)
  const outstanding = unpaid.reduce((sum, debt) => sum + Number(debt.amount || 0), 0)
  const payments = transactions.filter((txn) => Number(txn.amount_paid) > 0)
  const totalPaid = payments.reduce((sum, txn) => sum + Number(txn.amount_paid || 0), 0)

  return (
    <Modal onClose={onClose} panelClassName="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <h3 className="font-semibold text-slate-900">Customer account</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close customer account"
          className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold sm:h-14 sm:w-14 ${AVATAR_TONE[status]}`}
          >
            {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {customer.customer_name}
              </h4>
              <Badge color={meta.color} dot>
                {meta.label}
              </Badge>
            </div>
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-neutral-light sm:flex-row sm:items-center sm:gap-3">
              {customer.customer_phone && <span className="truncate">{customer.customer_phone}</span>}
              {customer.customer_email && <span className="truncate">{customer.customer_email}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-wide text-neutral-light sm:text-[11px]">Outstanding</p>
            <p className="mt-1 truncate text-sm font-bold text-danger sm:text-lg">
              {loading ? '—' : formatCedi(outstanding)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50/70 p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-wide text-neutral-light sm:text-[11px]">Total paid</p>
            <p className="mt-1 truncate text-sm font-bold text-success sm:text-lg">
              {loading ? '—' : formatCedi(totalPaid)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
            <p className="text-[10px] uppercase tracking-wide text-neutral-light sm:text-[11px]">Open debts</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-lg">
              {loading ? '—' : unpaid.length}
            </p>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-sm font-semibold text-slate-900">Open debts</h5>
            {unpaid.length > 0 && (
              <span className="text-xs text-neutral-light">
                {unpaid.length} balance{unpaid.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : unpaid.length > 0 ? (
            <div className="space-y-2">
              {unpaid.map((debt) => {
                const overdue = isOverdue(debt.due_date)
                return (
                  <div
                    key={debt.debt_id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => onViewDebt(debt)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-warning">
                        <CashIcon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-900">{formatCedi(debt.amount)}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-light">
                          <span>{formatDateLabel(debt.due_date) || 'No due date'}</span>
                          <span className={overdue ? 'font-medium text-danger' : ''}>{dueLabel(debt.due_date)}</span>
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                      {overdue ? (
                        <Badge color="red">Overdue</Badge>
                      ) : (
                        <Badge color="amber">Pending</Badge>
                      )}
                      {canRemind && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onRemind(debt.debt_id)}
                          leftIcon={<BellIcon className="h-3.5 w-3.5" />}
                        >
                          Remind
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              compact
              icon={<CheckCircleIcon className="h-6 w-6 text-success" />}
              title="No open debts"
              description="This customer is fully settled."
            />
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-sm font-semibold text-slate-900">Payment history</h5>
            {payments.length > 0 && (
              <span className="text-xs text-neutral-light">
                {payments.length} payment{payments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="skeleton h-16 rounded-xl" aria-hidden="true" />
          ) : payments.length > 0 ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {payments.map((txn) => (
                <button
                  key={txn.transaction_id}
                  type="button"
                  onClick={() => onViewTransaction(txn)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-success">
                    <CheckCircleIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-success">{formatCedi(txn.amount_paid)}</span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-light">
                      {new Date(txn.created_at).toLocaleDateString()}
                      {txn.note ? ` · ${txn.note}` : ''}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-neutral-light" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={<CalendarIcon className="h-6 w-6" />}
              title="No payments yet"
              description="Payments recorded for this customer will appear here."
            />
          )}
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2 rounded-b-2xl border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        {customer.total_debt > 0 && canPayDebt && (
          <Button onClick={onRecordPayment} className="sm:flex-1">
            Record payment
          </Button>
        )}
        {customer.total_debt > 0 && canRemind && (
          <Button
            variant="secondary"
            onClick={() => onRemind()}
            leftIcon={<BellIcon className="h-4 w-4" />}
            className="sm:flex-1"
          >
            Schedule reminder
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
