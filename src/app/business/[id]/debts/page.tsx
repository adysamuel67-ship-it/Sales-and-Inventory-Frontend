'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { debtAPI, customerAPI } from '@/lib/api'
import { extractArray, parseApiError, isAdminRole, formatCedi } from '@/lib/utils'
import { formatDateLabel } from '@/lib/dates'
import {
  AGING_BUCKETS,
  AGING_LABELS,
  aggregateDebtRows,
  daysOverdue,
  daysUntilDue,
  debtorStatus,
  filterDebtors,
  filterDebtorsByAging,
  hasOverdueDebt,
  isOverdue,
  oldestDebtDate,
  openDebts,
  sortDebtors,
  summarizeAging,
  summarizeDebts,
  summarizeDueSoon,
  type AgingBucket,
  type AgingFilter,
  type DebtSort,
  type DebtTab,
  type DebtorStatus,
} from '@/lib/debts'
import type { Debtor, DebtPayment, DebtRecord, DebtSummary } from '@/lib/types'
import ScheduleReminderModal from '@/components/ScheduleReminderModal'
import RemindersSection from '@/components/RemindersSection'
import DebtProfileModal from '@/components/DebtProfileModal'
import PageHeader from '@/components/ui/PageHeader'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import {
  PlusIcon,
  CashIcon,
  SearchIcon,
  CalendarIcon,
  AlertTriangleIcon,
  BellIcon,
  XIcon,
} from '@/components/ui/Icons'
import Modal from '@/components/ui/Modal'

const STATUS_META: Record<DebtorStatus, { label: string; color: 'red' | 'amber' | 'emerald' }> = {
  overdue: { label: 'Overdue', color: 'red' },
  pending: { label: 'Pending', color: 'amber' },
  paid: { label: 'Settled', color: 'emerald' },
}

const AGING_TONE: Record<AgingBucket, { bar: string; amount: string; active: string }> = {
  current: {
    bar: 'bg-emerald-500',
    amount: 'text-emerald-700',
    active: 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-200',
  },
  '1-30': {
    bar: 'bg-amber-500',
    amount: 'text-amber-700',
    active: 'bg-amber-50/70 ring-1 ring-inset ring-amber-200',
  },
  '31-60': {
    bar: 'bg-orange-500',
    amount: 'text-orange-700',
    active: 'bg-orange-50/70 ring-1 ring-inset ring-orange-200',
  },
  '61-90': {
    bar: 'bg-rose-500',
    amount: 'text-rose-700',
    active: 'bg-rose-50/70 ring-1 ring-inset ring-rose-200',
  },
  '90+': {
    bar: 'bg-red-600',
    amount: 'text-red-700',
    active: 'bg-red-50/70 ring-1 ring-inset ring-red-200',
  },
}

type CustomerWithDebt = Debtor
type CustomerTransaction = DebtPayment
type Tab = DebtTab | 'reminders'

export default function DebtsPage() {
  const params = useParams()
  const businessId = parseInt(params?.id as string)
  const { user } = useAuth()

  const [customers, setCustomers] = useState<CustomerWithDebt[]>([])
  const [summary, setSummary] = useState<DebtSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [sortOrder, setSortOrder] = useState<DebtSort>('oldest')
  const [agingFilter, setAgingFilter] = useState<AgingFilter>('all')

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentCustomer, setPaymentCustomer] = useState<CustomerWithDebt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentFullyPaid, setPaymentFullyPaid] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [showAddDebtModal, setShowAddDebtModal] = useState(false)
  const [addDebtCustomerId, setAddDebtCustomerId] = useState('')
  const [addDebtAmount, setAddDebtAmount] = useState('')
  const [addDebtDueDate, setAddDebtDueDate] = useState('')
  const [addDebtNote, setAddDebtNote] = useState('')
  const [addingDebt, setAddingDebt] = useState(false)
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [addDebtNewCustomer, setAddDebtNewCustomer] = useState(false)
  const [addDebtNewName, setAddDebtNewName] = useState('')
  const [addDebtNewPhone, setAddDebtNewPhone] = useState('')
  const [addDebtNewEmail, setAddDebtNewEmail] = useState('')

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileCustomer, setProfileCustomer] = useState<CustomerWithDebt | null>(null)
  const [profileTransactions, setProfileTransactions] = useState<CustomerTransaction[]>([])
  const [profileLoading, setProfileLoading] = useState(false)

  const [showDebtDetailModal, setShowDebtDetailModal] = useState(false)
  const [debtDetailData, setDebtDetailData] = useState<{ debt: DebtRecord; customer: CustomerWithDebt } | null>(null)

  const [showTxnDetailModal, setShowTxnDetailModal] = useState(false)
  const [txnDetailData, setTxnDetailData] = useState<CustomerTransaction | null>(null)
  const isAdmin = isAdminRole(user?.business_role || user?.role)
  const canPayDebt = isAdmin || user?.business_role === 'cashier' || user?.role === 'cashier'
  const canRemind = canPayDebt

  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderCustomer, setReminderCustomer] = useState<CustomerWithDebt | null>(null)
  const [reminderDefaultDebtId, setReminderDefaultDebtId] = useState<number | undefined>()

  const openReminder = (customer: CustomerWithDebt, debtId?: number) => {
    setReminderCustomer(customer)
    setReminderDefaultDebtId(debtId)
    setShowReminderModal(true)
  }

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const showSuccess = useCallback((msg: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccess(msg)
    successTimerRef.current = setTimeout(() => setSuccess(''), 4000)
  }, [])

  const loadDebts = useCallback(async () => {
    if (!businessId || isNaN(businessId)) return
    setLoading(true)
    setError('')
    try {
      const debtRes = await debtAPI.listCustomersWithDebt(businessId)
      const customerList = aggregateDebtRows(extractArray(debtRes.data))
      setCustomers(customerList)
      setSummary(summarizeDebts(customerList))
    } catch (err: any) {
      setError(parseApiError(err))
    }

    try {
      const custRes = await customerAPI.list(businessId)
      setAllCustomers(extractArray(custRes.data))
    } catch {
      // Non-critical
    }

    setLoading(false)
  }, [businessId])

  useEffect(() => {
    if (businessId) loadDebts()
  }, [businessId, loadDebts])

  const debtCustomers = useMemo(() => customers.filter((c) => c.total_debt > 0), [customers])
  const paidCustomers = useMemo(() => customers.filter((c) => c.total_debt <= 0), [customers])
  const overdueCustomers = useMemo(() => debtCustomers.filter((c) => hasOverdueDebt(c)), [debtCustomers])
  const aging = useMemo(() => summarizeAging(customers), [customers])
  const dueSoon = useMemo(() => summarizeDueSoon(customers), [customers])

  const listTab: DebtTab = activeTab === 'reminders' ? 'all' : activeTab
  const effectiveAging: AgingFilter = listTab === 'all' ? agingFilter : 'all'
  const filtered = useMemo(
    () =>
      sortDebtors(
        filterDebtorsByAging(filterDebtors(customers, listTab, search), effectiveAging),
        sortOrder
      ),
    [customers, listTab, search, effectiveAging, sortOrder]
  )

  const changeTab = (tab: Tab) => {
    setActiveTab(tab)
    setAgingFilter('all')
  }

  const toggleAging = (bucket: AgingBucket) => {
    setActiveTab('all')
    setAgingFilter((current) => (current === bucket ? 'all' : bucket))
  }

  const dueHint = (dueDate: string) => {
    if (!dueDate) return 'No due date'
    if (isOverdue(dueDate)) {
      const days = daysOverdue(dueDate)
      return `${days} day${days === 1 ? '' : 's'} overdue`
    }
    const days = daysUntilDue(dueDate)
    if (days === 0) return 'Due today'
    return `Due in ${days} day${days === 1 ? '' : 's'}`
  }

  const avatarTone: Record<DebtorStatus, string> = {
    overdue: 'bg-rose-50 text-danger',
    pending: 'bg-amber-50 text-warning',
    paid: 'bg-emerald-50 text-success',
  }

  const openPayment = (customer: CustomerWithDebt) => {
    setPaymentCustomer(customer)
    setPaymentAmount('')
    setPaymentNote('')
    setPaymentFullyPaid(false)
    setShowPaymentModal(true)
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !paymentCustomer) return
    setSubmitting(true)
    setError('')
    try {
      const payload: any = {}
      if (paymentFullyPaid) {
        payload.fully_paid = true
      } else {
        const amount = parseFloat(paymentAmount)
        if (isNaN(amount) || amount <= 0) {
          setError('Please enter a valid payment amount')
          setSubmitting(false)
          return
        }
        payload.amount = amount
      }
      if (paymentNote.trim()) {
        payload.note = paymentNote.trim()
      }

      const oldestUnpaid = paymentCustomer.debts.find((d) => !d.is_paid && d.sale_id)
      if (oldestUnpaid?.sale_id) {
        payload.sale_id = oldestUnpaid.sale_id
      }

      try {
        await debtAPI.updateDebt(businessId, paymentCustomer.customer_id, payload)
        setShowPaymentModal(false)
        showSuccess('Payment recorded successfully!')
      } catch (apiErr: any) {
        const detail = apiErr?.response?.data?.detail
        const msg = typeof detail === 'string' ? detail : ''
        if (msg.includes('No outstanding debt')) {
          setShowPaymentModal(false)
          showSuccess('Customer debt is fully settled!')
        } else {
          throw apiErr
        }
      }
      loadDebts()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : parseApiError(err)
      setError(msg || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const openAddDebt = () => {
    setAddDebtCustomerId('')
    setAddDebtAmount('')
    setAddDebtDueDate('')
    setAddDebtNote('')
    setAddDebtNewCustomer(false)
    setAddDebtNewName('')
    setAddDebtNewPhone('')
    setAddDebtNewEmail('')
    setShowAddDebtModal(true)
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return
    setAddingDebt(true)
    setError('')
    try {
      const amount = parseFloat(addDebtAmount)
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid debt amount')
        setAddingDebt(false)
        return
      }

      let customerId: number | null = null

      if (addDebtNewCustomer) {
        if (!addDebtNewName.trim() || !addDebtNewPhone.trim()) {
          setError('Customer name and phone are required')
          setAddingDebt(false)
          return
        }
        try {
          const customerPayload: any = {
            name: addDebtNewName.trim(),
            phone: addDebtNewPhone.trim(),
          }
          if (addDebtNewEmail.trim()) {
            customerPayload.email = addDebtNewEmail.trim()
          }
          const newCustomerRes = await customerAPI.create(businessId, customerPayload)
          customerId = newCustomerRes.data?.customer_id ?? newCustomerRes.data?.id
        } catch {
          setError('Failed to create customer. Please check the details and try again.')
          setAddingDebt(false)
          return
        }
      } else {
        if (!addDebtCustomerId) {
          setError('Please select a customer')
          setAddingDebt(false)
          return
        }
        customerId = parseInt(addDebtCustomerId)
      }

      if (!customerId) {
        setError('Customer ID could not be determined')
        setAddingDebt(false)
        return
      }

      const payload: any = {
        amount,
        due_date: addDebtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        note: addDebtNote.trim() || 'Debt recorded',
      }

      await debtAPI.addDebt(businessId, customerId, payload)
      setShowAddDebtModal(false)
      showSuccess('Debt added successfully!')
      loadDebts()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setAddingDebt(false)
    }
  }

  const openProfile = async (customer: CustomerWithDebt) => {
    setProfileCustomer(customer)
    setShowProfileModal(true)
    setProfileLoading(true)
    setProfileTransactions([])

    try {
      const txnRes = await debtAPI.getCustomerTransactions(businessId, customer.customer_id)
      const arr = extractArray(txnRes.data)
      setProfileTransactions(arr.map((item: any) => {
        const txn = item.transactions || item
        return {
          transaction_id: txn.transaction_id ?? txn.id ?? item.transaction_id ?? item.id,
          debt_id: txn.debt_id ?? item.debt_id,
          performer_id: txn.performer_id ?? item.performer_id,
          business_id: txn.business_id ?? item.business_id,
          customer_id: txn.customer_id ?? item.customer_id,
          amount_paid: Number(txn.amount_paid ?? item.amount_paid ?? 0),
          note: txn.note || item.note || '',
          created_at: txn.created_at || item.created_at || '',
          customer_name: item.customer_name || txn.customer_name,
          customer_phone: item.customer_phone || txn.customer_phone,
          customer_email: item.customer_email || txn.customer_email,
          customer_address: item.customer_address || txn.customer_address,
        }
      }))
    } catch {
    } finally {
      setProfileLoading(false)
    }
  }

  const formatCurrency = (amount: number) => formatCedi(amount)

  return (
    <div>
      <PageHeader
        eyebrow="Credit & Collections"
        title="Debt Tracker"
        subtitle="Track outstanding balances, aging, and collections"
        actions={isAdmin && (
          <Button onClick={openAddDebt} leftIcon={<PlusIcon className="w-4 h-4" />}>
            Add Debt
          </Button>
        )}
      />

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert kind="success">{success}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-32 rounded-2xl" />
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton h-10 w-72 rounded-xl" />
            <div className="skeleton h-4 w-20" />
          </div>
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
            {summary && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <section className="surface-card kpi-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-micro uppercase tracking-[0.08em] text-neutral-light">Outstanding</p>
                      <p className="mt-1 truncate text-kpi text-slate-900">{formatCurrency(summary.total_outstanding)}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <CashIcon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-light">
                    Across {summary.total_customers} customer{summary.total_customers !== 1 ? 's' : ''}
                  </p>
                </section>

                <section className="surface-card kpi-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-micro uppercase tracking-[0.08em] text-neutral-light">Overdue</p>
                      <p className="mt-1 truncate text-kpi text-danger">{formatCurrency(summary.overdue_amount)}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-danger">
                      <AlertTriangleIcon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-light">
                    {summary.total_overdue} invoice{summary.total_overdue !== 1 ? 's' : ''} past due
                  </p>
                </section>

                <section className="surface-card kpi-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-micro uppercase tracking-[0.08em] text-neutral-light">Due this week</p>
                      <p className="mt-1 truncate text-kpi text-warning">{formatCurrency(dueSoon.amount)}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-warning">
                      <CalendarIcon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-light">
                    {dueSoon.debts} debt{dueSoon.debts !== 1 ? 's' : ''} coming due in 7 days
                  </p>
                </section>
              </div>
            )}

            <section className="surface-card overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-section-title text-slate-900">Receivables aging</h2>
                  <p className="mt-0.5 text-xs text-neutral-light">
                    {agingFilter === 'all'
                      ? 'Click a bucket to focus the list below.'
                      : `Showing ${AGING_LABELS[agingFilter]} balances only.`}
                  </p>
                </div>
                {agingFilter !== 'all' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAgingFilter('all')}
                    leftIcon={<XIcon className="h-3.5 w-3.5" />}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5">
                {AGING_BUCKETS.map((bucket) => {
                  const entry = aging[bucket]
                  const active = agingFilter === bucket
                  const tone = AGING_TONE[bucket]
                  return (
                    <button
                      key={bucket}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleAging(bucket)}
                      className={`flex flex-col items-start gap-1 border-b border-slate-100 px-4 py-4 text-left transition-colors even:border-l sm:border-b-0 sm:border-l sm:first:border-l-0 ${
                        active ? tone.active : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-1 w-8 rounded-full ${tone.bar}`} aria-hidden="true" />
                      <span className="mt-1 text-micro uppercase tracking-[0.08em] text-neutral-light">
                        {AGING_LABELS[bucket]}
                      </span>
                      <span className={`text-base font-semibold ${tone.amount}`}>{formatCurrency(entry.amount)}</span>
                      <span className="text-[11px] text-neutral-light">
                        {entry.customers} customer{entry.customers !== 1 ? 's' : ''} · {entry.debts} debt{entry.debts !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
                {([
                  { key: 'all' as Tab, label: 'In debt', count: debtCustomers.length },
                  { key: 'overdue' as Tab, label: 'Overdue', count: overdueCustomers.length },
                  { key: 'paid' as Tab, label: 'Settled', count: paidCustomers.length },
                  { key: 'reminders' as Tab, label: 'Reminders', count: undefined },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => changeTab(tab.key)}
                    aria-pressed={activeTab === tab.key}
                    className={`flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count != null && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                          activeTab === tab.key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/70 text-slate-500'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {activeTab !== 'reminders' && (
                <p className="text-xs text-neutral-light">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {activeTab === 'reminders' ? (
              <RemindersSection businessId={businessId} />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-light" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, phone, or email..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-xs outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 min-h-[44px]"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-light transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as DebtSort)}
                    aria-label="Sort debts"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition-all hover:border-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 min-h-[44px]"
                  >
                    <option value="oldest">Oldest due first</option>
                    <option value="highest">Highest balance</option>
                    <option value="lowest">Lowest balance</option>
                  </select>
                </div>

                <section className="surface-card overflow-hidden">
                  {filtered.length > 0 ? (
                    <>
                      <div className="hidden md:block">
                        <table className="data-table w-full">
                          <thead>
                            <tr>
                              <th>Customer</th>
                              <th>Status</th>
                              <th className="text-right">Outstanding</th>
                              <th>Oldest due</th>
                              <th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((customer) => {
                              const status = debtorStatus(customer)
                              const meta = STATUS_META[status]
                              const oldest = oldestDebtDate(customer)
                              const open = openDebts(customer)
                              return (
                                <tr key={customer.customer_id}>
                                  <td>
                                    <button
                                      type="button"
                                      onClick={() => openProfile(customer)}
                                      className="flex items-center gap-3 text-left"
                                    >
                                      <span
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone[status]}`}
                                      >
                                        {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block truncate font-medium text-slate-900">{customer.customer_name}</span>
                                        {(customer.customer_phone || customer.customer_email) && (
                                          <span className="mt-0.5 block truncate text-xs text-neutral-light">
                                            {customer.customer_phone || customer.customer_email}
                                          </span>
                                        )}
                                      </span>
                                    </button>
                                  </td>
                                  <td>
                                    <Badge color={meta.color} dot>
                                      {meta.label}
                                    </Badge>
                                  </td>
                                  <td className="text-right">
                                    <div className="font-semibold text-slate-900">{formatCurrency(customer.total_debt)}</div>
                                    <div className="text-[11px] text-neutral-light">
                                      {open.length} open debt{open.length !== 1 ? 's' : ''}
                                    </div>
                                  </td>
                                  <td>
                                    {oldest ? (
                                      <>
                                        <div className="text-slate-700">{formatDateLabel(oldest)}</div>
                                        <div className={`text-[11px] ${isOverdue(oldest) ? 'font-medium text-danger' : 'text-neutral-light'}`}>
                                          {dueHint(oldest)}
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-xs text-neutral-light">No due date</span>
                                    )}
                                  </td>
                                  <td className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {customer.total_debt > 0 && canRemind && (
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          onClick={() => openReminder(customer)}
                                          leftIcon={<BellIcon className="h-3.5 w-3.5" />}
                                        >
                                          Remind
                                        </Button>
                                      )}
                                      {customer.total_debt > 0 && canPayDebt && (
                                        <Button size="xs" onClick={() => openPayment(customer)}>
                                          Pay
                                        </Button>
                                      )}
                                      {customer.total_debt <= 0 && (
                                        <Button variant="secondary" size="xs" onClick={() => openProfile(customer)}>
                                          View
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-slate-100 md:hidden">
                        {filtered.map((customer) => {
                          const status = debtorStatus(customer)
                          const meta = STATUS_META[status]
                          const oldest = oldestDebtDate(customer)
                          const open = openDebts(customer)
                          return (
                            <article key={customer.customer_id} className="p-4">
                              <button
                                type="button"
                                onClick={() => openProfile(customer)}
                                className="flex w-full items-start gap-3 text-left"
                              >
                                <span
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone[status]}`}
                                >
                                  {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium text-slate-900">{customer.customer_name}</span>
                                  {(customer.customer_phone || customer.customer_email) && (
                                    <span className="mt-0.5 block truncate text-xs text-neutral-light">
                                      {customer.customer_phone || customer.customer_email}
                                    </span>
                                  )}
                                </span>
                                <Badge color={meta.color} dot>
                                  {meta.label}
                                </Badge>
                              </button>
                              <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-neutral-light">Outstanding</p>
                                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatCurrency(customer.total_debt)}</p>
                                  <p className="text-[11px] text-neutral-light">{open.length} open debt{open.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-wide text-neutral-light">Oldest due</p>
                                  <p className="mt-0.5 text-sm text-slate-800">{oldest ? formatDateLabel(oldest) : 'No due date'}</p>
                                  <p className={`text-[11px] ${oldest && isOverdue(oldest) ? 'font-medium text-danger' : 'text-neutral-light'}`}>
                                    {dueHint(oldest)}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                {customer.total_debt > 0 && canRemind && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => openReminder(customer)}
                                    leftIcon={<BellIcon className="h-4 w-4" />}
                                  >
                                    Remind
                                  </Button>
                                )}
                                {customer.total_debt > 0 && canPayDebt && (
                                  <Button size="sm" className="flex-1" onClick={() => openPayment(customer)}>
                                    Record payment
                                  </Button>
                                )}
                                {customer.total_debt <= 0 && (
                                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => openProfile(customer)}>
                                    View history
                                  </Button>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={<CashIcon className="w-6 h-6 text-primary" />}
                      title={
                        search
                          ? 'No customers match your search'
                          : agingFilter !== 'all'
                            ? `No ${AGING_LABELS[agingFilter]} balances`
                            : activeTab === 'overdue'
                              ? 'No overdue debts'
                              : activeTab === 'paid'
                                ? 'No settled customers yet'
                                : 'No outstanding debts'
                      }
                      description={
                        search
                          ? 'Try a different search term'
                          : agingFilter !== 'all'
                            ? 'Try another aging bucket or clear the filter'
                            : activeTab === 'paid'
                              ? 'Customers who clear their balance will appear here'
                              : 'All customers are up to date'
                      }
                      action={
                        agingFilter !== 'all' ? (
                          <Button variant="secondary" size="sm" onClick={() => setAgingFilter('all')}>
                            Clear aging filter
                          </Button>
                        ) : undefined
                      }
                    />
                  )}
                </section>
              </div>
            )}
          </div>
      )}

      {showPaymentModal && paymentCustomer && (
        <Modal onClose={() => setShowPaymentModal(false)} panelClassName="w-full max-w-md">
          <div className="px-6 py-4 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Record Payment</h3>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handlePayment} className="px-6 py-5 space-y-4">
            <div className="bg-surfaceAlt rounded-xl p-4">
              <p className="text-xs text-neutral-light mb-1">Customer</p>
              <p className="text-sm font-semibold text-slate-900">{paymentCustomer.customer_name}</p>
              <p className="text-xs text-neutral-light mt-1">
                Outstanding: <span className="font-semibold text-danger">{formatCurrency(paymentCustomer.total_debt)}</span>
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={paymentFullyPaid}
                  onChange={(e) => setPaymentFullyPaid(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">Mark as fully paid</span>
              </label>
            </div>

            {!paymentFullyPaid && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Amount (GH\u20B5)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentCustomer.total_debt}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Partial payment via MoMo"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {submitting ? 'Recording...' : paymentFullyPaid ? 'Mark as Paid' : 'Record Payment'}
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showAddDebtModal && (
        <Modal onClose={() => setShowAddDebtModal(false)} panelClassName="w-full max-w-md">
          <div className="px-6 py-4 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Add New Debt</h3>
            <button
              onClick={() => setShowAddDebtModal(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleAddDebt} className="px-6 py-5 space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={addDebtNewCustomer}
                  onChange={(e) => {
                    setAddDebtNewCustomer(e.target.checked)
                    setAddDebtCustomerId('')
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-slate-700">Create new customer</span>
              </label>
            </div>

            {addDebtNewCustomer ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Name *</label>
                  <input
                    type="text"
                    value={addDebtNewName}
                    onChange={(e) => setAddDebtNewName(e.target.value)}
                    placeholder="Customer's full name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Phone *</label>
                  <input
                    type="tel"
                    value={addDebtNewPhone}
                    onChange={(e) => setAddDebtNewPhone(e.target.value)}
                    placeholder="024XXXXXXX"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Email</label>
                  <input
                    type="email"
                    value={addDebtNewEmail}
                    onChange={(e) => setAddDebtNewEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer *</label>
                <select
                  value={addDebtCustomerId}
                  onChange={(e) => setAddDebtCustomerId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
                >
                  <option value="">Select a customer</option>
                  {allCustomers.map((c: any) => (
                    <option key={c.customer_id ?? c.id} value={c.customer_id ?? c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (GH\u20B5) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={addDebtAmount}
                onChange={(e) => setAddDebtAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={addDebtDueDate}
                onChange={(e) => setAddDebtDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={addDebtNote}
                onChange={(e) => setAddDebtNote(e.target.value)}
                placeholder="e.g. Goods delivered on credit"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={addingDebt}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {addingDebt ? 'Adding...' : 'Add Debt'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddDebtModal(false)}
                className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showProfileModal && profileCustomer && (
        <DebtProfileModal
          customer={profileCustomer}
          transactions={profileTransactions}
          loading={profileLoading}
          canPayDebt={canPayDebt}
          canRemind={canRemind}
          onClose={() => setShowProfileModal(false)}
          onRecordPayment={() => {
            setShowProfileModal(false)
            openPayment(profileCustomer)
          }}
          onRemind={(debtId) => openReminder(profileCustomer, debtId)}
          onViewDebt={(debt) => {
            setDebtDetailData({ debt, customer: profileCustomer })
            setShowDebtDetailModal(true)
          }}
          onViewTransaction={(txn) => {
            setTxnDetailData(txn)
            setShowTxnDetailModal(true)
          }}
        />
      )}

      {showReminderModal && reminderCustomer && (
        <ScheduleReminderModal
          businessId={businessId}
          customer={reminderCustomer}
          defaultDebtId={reminderDefaultDebtId}
          onClose={() => setShowReminderModal(false)}
          onScheduled={(name) => showSuccess(`Reminder scheduled for ${name}`)}
        />
      )}

      {showDebtDetailModal && debtDetailData && (
        <Modal onClose={() => setShowDebtDetailModal(false)} panelClassName="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 rounded-t-2xl flex items-center justify-between z-10">
            <h3 className="font-semibold text-slate-900">Borrow Details</h3>
            <button onClick={() => setShowDebtDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="px-5 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-warning-light flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-neutral-light">Amount Borrowed</p>
                <p className="text-xl font-bold text-warning">{formatCurrency(debtDetailData.debt.amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surfaceAlt rounded-xl p-4">
                <p className="text-xs text-neutral-light mb-1">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  debtDetailData.debt.is_paid ? 'bg-success-light text-success' : isOverdue(debtDetailData.debt.due_date) ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
                }`}>
                  {debtDetailData.debt.is_paid ? 'Paid' : isOverdue(debtDetailData.debt.due_date) ? 'Overdue' : 'Pending'}
                </span>
              </div>
              <div className="bg-surfaceAlt rounded-xl p-4">
                <p className="text-xs text-neutral-light mb-1">Customer</p>
                <p className="text-sm font-medium text-slate-900">{debtDetailData.customer.customer_name}</p>
              </div>
            </div>

            <div className="bg-surfaceAlt rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                <span className="text-slate-700">Created: {debtDetailData.debt.created_at ? new Date(debtDetailData.debt.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              {debtDetailData.debt.due_date && (
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-slate-700">Due: {formatDateLabel(debtDetailData.debt.due_date)}</span>
                  {!debtDetailData.debt.is_paid && isOverdue(debtDetailData.debt.due_date) && (
                    <span className="text-xs text-danger font-medium ml-1">(overdue)</span>
                  )}
                </div>
              )}
            </div>

            {debtDetailData.customer.customer_phone && (
              <div className="bg-surfaceAlt rounded-xl p-4">
                <p className="text-xs text-neutral-light mb-1">Customer Phone</p>
                <p className="text-sm font-medium text-slate-900">{debtDetailData.customer.customer_phone}</p>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 rounded-b-2xl">
            <button onClick={() => setShowDebtDetailModal(false)} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        </Modal>
      )}

      {showTxnDetailModal && txnDetailData && (
        <Modal onClose={() => setShowTxnDetailModal(false)} panelClassName="w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 rounded-t-2xl flex items-center justify-between z-10">
            <h3 className="font-semibold text-slate-900">{txnDetailData.amount_paid === 0 ? 'Borrow Details' : 'Payment Details'}</h3>
            <button onClick={() => setShowTxnDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="px-5 py-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${txnDetailData.amount_paid === 0 ? 'bg-warning-light' : 'bg-success-light'}`}>
                {txnDetailData.amount_paid === 0 ? (
                  <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-xs text-neutral-light">{txnDetailData.amount_paid === 0 ? 'Item Borrowed' : 'Amount Paid'}</p>
                <p className={`text-xl font-bold ${txnDetailData.amount_paid === 0 ? 'text-warning' : 'text-success'}`}>
                  {txnDetailData.amount_paid === 0 ? (txnDetailData.note || 'Borrowed') : formatCurrency(txnDetailData.amount_paid)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surfaceAlt rounded-xl p-4">
                <p className="text-xs text-neutral-light mb-1">Transaction ID</p>
                <p className="text-sm font-medium text-slate-900">#{txnDetailData.transaction_id}</p>
              </div>
              <div className="bg-surfaceAlt rounded-xl p-4">
                <p className="text-xs text-neutral-light mb-1">Customer</p>
                <p className="text-sm font-medium text-slate-900">{txnDetailData.customer_name || profileCustomer?.customer_name || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-surfaceAlt rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                <span className="text-slate-700">Date: {txnDetailData.created_at ? new Date(txnDetailData.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              {txnDetailData.note && (
                <div className="flex items-start gap-2 text-sm">
                  <svg className="w-4 h-4 text-neutral-light shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                  <span className="text-slate-700">{txnDetailData.note}</span>
                </div>
              )}
            </div>
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 rounded-b-2xl">
            <button onClick={() => setShowTxnDetailModal(false)} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
