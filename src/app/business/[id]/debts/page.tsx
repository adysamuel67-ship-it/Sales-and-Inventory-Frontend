'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { debtAPI, customerAPI, saleAPI } from '@/lib/api'
import { extractArray, parseApiError, isAdminRole, MappedSale } from '@/lib/utils'
import SaleDetailModal from '@/components/SaleDetailModal'

interface DebtRecord {
  debt_id: number
  amount: number
  due_date: string
  is_paid: boolean
  created_at: string
}

interface CustomerWithDebt {
  customer_id: number
  customer_name: string
  customer_email?: string
  customer_phone?: string
  total_debt: number
  debts: DebtRecord[]
}

interface DebtSummary {
  total_outstanding: number
  total_customers: number
  total_overdue: number
  overdue_amount: number
}

interface CustomerTransaction {
  transaction_id: number
  debt_id: number
  performer_id: number
  business_id: number
  customer_id?: number
  amount_paid: number
  note?: string
  created_at: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
}

type Tab = 'all' | 'overdue' | 'paid'

function isOverdue(dueDate: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function daysUntilDue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = due.getTime() - today.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

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
  const [sortOrder, setSortOrder] = useState<'highest' | 'lowest' | 'oldest'>('highest')

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

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<CustomerWithDebt | null>(null)

  const [detailSale, setDetailSale] = useState<MappedSale | null>(null)

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileCustomer, setProfileCustomer] = useState<CustomerWithDebt | null>(null)
  const [profileTransactions, setProfileTransactions] = useState<CustomerTransaction[]>([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSales, setProfileSales] = useState<any[]>([])

  const isAdmin = isAdminRole(user?.role)

  const successTimer = useCallback(() => {
    const t = setTimeout(() => setSuccess(''), 4000)
    return () => clearTimeout(t)
  }, [])

  const loadDebts = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError('')
    try {
      const [debtRes, totalRes] = await Promise.allSettled([
        debtAPI.listCustomersWithDebt(businessId),
        debtAPI.getTotalDebt(businessId),
      ])

      if (debtRes.status === 'fulfilled') {
        const raw = debtRes.value.data
        const arr = extractArray(raw)
        const customerMap = new Map<number, CustomerWithDebt>()

        for (const item of arr) {
          const debt = item.debt || item
          const custId = Number(debt.customer_id ?? item.customer_id ?? item.user_id ?? item.id)
          if (!custId) continue

          const debtAmount = Number(debt.amount ?? debt.customer_debt ?? debt.total_debt ?? item.customer_debt ?? item.amount ?? 0)
          const existing = customerMap.get(custId)

          if (existing) {
            existing.total_debt += debtAmount
            if (debt.debt_id || debt.id) {
              existing.debts.push({
                debt_id: debt.debt_id ?? debt.id,
                amount: debtAmount,
                due_date: debt.due_date || '',
                is_paid: debt.is_paid ?? false,
                created_at: debt.created_at || '',
              })
            }
          } else {
            customerMap.set(custId, {
              customer_id: custId,
              customer_name: item.customer_name ?? item.name ?? `Customer #${custId}`,
              customer_email: item.customer_email ?? item.email ?? '',
              customer_phone: item.customer_phone ?? item.phone ?? '',
              total_debt: debtAmount,
              debts: (debt.debt_id || debt.id) ? [{
                debt_id: debt.debt_id ?? debt.id,
                amount: debtAmount,
                due_date: debt.due_date || '',
                is_paid: debt.is_paid ?? false,
                created_at: debt.created_at || '',
              }] : [],
            })
          }
        }

        const customerList = Array.from(customerMap.values())
        setCustomers(customerList)

        let totalOutstanding = 0
        let totalCustomers = 0
        let totalOverdue = 0
        let overdueAmount = 0

        for (const c of customerList) {
          if (c.total_debt > 0) {
            totalOutstanding += c.total_debt
            totalCustomers++
            for (const d of c.debts) {
              if (!d.is_paid && d.due_date && isOverdue(d.due_date)) {
                totalOverdue++
                overdueAmount += d.amount
              }
            }
          }
        }

        setSummary({
          total_outstanding: totalOutstanding,
          total_customers: totalCustomers,
          total_overdue: totalOverdue,
          overdue_amount: overdueAmount,
        })
      } else {
        setError(parseApiError(debtRes.reason))
      }

      try {
        const custRes = await customerAPI.list(businessId)
        setAllCustomers(extractArray(custRes.data))
      } catch {
        // Non-critical
      }
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (businessId) loadDebts()
  }, [businessId, loadDebts])

  if (isNaN(businessId)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Invalid business</h2>
        <p className="text-sm text-gray-500">This business doesn&apos;t exist or the URL is invalid.</p>
      </div>
    )
  }

  const debtCustomers = customers.filter((c) => c.total_debt > 0)
  const paidCustomers = customers.filter((c) => c.total_debt <= 0 || c.debts.every((d) => d.is_paid))

  const displayedCustomers = activeTab === 'paid' ? paidCustomers : debtCustomers

  const overdueCustomers = debtCustomers.filter((c) =>
    c.debts.some((d) => !d.is_paid && d.due_date && isOverdue(d.due_date))
  )

  const tabFiltered = activeTab === 'overdue' ? overdueCustomers : displayedCustomers

  const sorted = [...tabFiltered].sort((a, b) => {
    if (sortOrder === 'highest') return b.total_debt - a.total_debt
    if (sortOrder === 'lowest') return a.total_debt - b.total_debt
    const aDate = a.debts[0]?.created_at || ''
    const bDate = b.debts[0]?.created_at || ''
    return new Date(aDate).getTime() - new Date(bDate).getTime()
  })

  const filtered = sorted.filter((c) =>
    c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_phone?.includes(search)
  )

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

      try {
        await debtAPI.updateDebt(businessId, paymentCustomer.customer_id, payload)
        setShowPaymentModal(false)
        setSuccess('Payment recorded successfully!')
        successTimer()
      } catch (apiErr: any) {
        const detail = apiErr?.response?.data?.detail
        const msg = typeof detail === 'string' ? detail : ''
        if (msg.includes('No outstanding debt')) {
          setShowPaymentModal(false)
          setSuccess('Customer debt is fully settled!')
          successTimer()
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
    setShowAddDebtModal(true)
  }

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !addDebtCustomerId) return
    setAddingDebt(true)
    setError('')
    try {
      const amount = parseFloat(addDebtAmount)
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid debt amount')
        setAddingDebt(false)
        return
      }

      const payload: any = {
        amount,
        due_date: addDebtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        note: addDebtNote.trim() || 'Debt recorded',
      }

      await debtAPI.addDebt(businessId, parseInt(addDebtCustomerId), payload)
      setShowAddDebtModal(false)
      setSuccess('Debt added successfully!')
      successTimer()
      loadDebts()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setAddingDebt(false)
    }
  }

  const openDetail = (customer: CustomerWithDebt) => {
    setDetailCustomer(customer)
    setShowDetailModal(true)
  }

  const openProfile = async (customer: CustomerWithDebt) => {
    setProfileCustomer(customer)
    setShowProfileModal(true)
    setProfileLoading(true)
    setProfileTransactions([])
    setProfileSales([])

    try {
      const [txnRes, salesRes] = await Promise.allSettled([
        debtAPI.getCustomerTransactions(businessId, customer.customer_id),
        saleAPI.list(businessId),
      ])

      if (txnRes.status === 'fulfilled') {
        const raw = txnRes.value.data
        const arr = extractArray(raw)
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
      }

      if (salesRes.status === 'fulfilled') {
        const sales = extractArray(salesRes.value.data)
        const customerSales = sales.filter((s: any) => {
          const saleCid = s.customer_id ?? s.customer?.customer_id
          return saleCid != null && Number(saleCid) === Number(customer.customer_id)
        })
        setProfileSales(customerSales)
      }
    } catch {
    } finally {
      setProfileLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    `GH\u20B5${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Tracker</h1>
          <p className="text-sm text-neutral-light mt-1">Track and manage customer debts</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddDebt}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Debt
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-success-light text-success text-sm p-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Outstanding</p>
                <p className="text-2xl font-bold text-danger mt-1">{formatCurrency(summary.total_outstanding)}</p>
                <p className="text-[10px] text-neutral-light mt-1">{summary.total_customers} customer{summary.total_customers !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Overdue</p>
                <p className="text-2xl font-bold text-warning mt-1">{summary.total_overdue}</p>
                <p className="text-[10px] text-neutral-light mt-1">{formatCurrency(summary.overdue_amount)} overdue</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
            {([
              { key: 'all' as Tab, label: `In Debt (${debtCustomers.length})` },
              { key: 'overdue' as Tab, label: `Overdue (${overdueCustomers.length})` },
              { key: 'paid' as Tab, label: `Paid (${paidCustomers.length})` },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 w-full sm:w-auto">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary outline-none min-h-[44px]"
            >
              <option value="highest">Highest Debt</option>
              <option value="lowest">Lowest Debt</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm">
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-100">
                      <th className="text-left px-5 py-3 font-medium">Customer</th>
                      <th className="text-right px-5 py-3 font-medium">Debt</th>
                      <th className="text-center px-5 py-3 font-medium hidden sm:table-cell">Status</th>
                      <th className="text-right px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((customer) => {
                      const hasOverdue = customer.debts.some((d) => !d.is_paid && d.due_date && isOverdue(d.due_date))
                      return (
                        <tr key={customer.customer_id} className="border-t border-gray-50 table-row-hover">
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => openProfile(customer)}
                              className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                            >
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                                hasOverdue ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
                              }`}>
                                {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 underline decoration-dotted underline-offset-2 cursor-pointer">{customer.customer_name}</div>
                                {customer.customer_phone && (
                                  <div className="text-xs text-neutral-light mt-0.5">{customer.customer_phone}</div>
                                )}
                              </div>
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`font-semibold ${customer.total_debt >= 100 ? 'text-danger' : 'text-warning'}`}>
                              {formatCurrency(customer.total_debt)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                            {hasOverdue ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger">
                                Overdue
                              </span>
                            ) : customer.total_debt > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">
                                Paid
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openProfile(customer)}
                                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Details
                              </button>
                              {customer.total_debt > 0 && isAdmin && (
                                <button
                                  onClick={() => openPayment(customer)}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                                >
                                  Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {search ? 'No customers match your search' :
                    activeTab === 'overdue' ? 'No overdue debts' :
                    activeTab === 'paid' ? 'No paid debts yet' :
                    'No outstanding debts'}
                </p>
                <p className="text-xs text-neutral-light">
                  {search ? 'Try a different search term' : 'All customers are up to date'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Record Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePayment} className="px-6 py-5 space-y-4">
              <div className="bg-surfaceAlt rounded-xl p-4">
                <p className="text-xs text-neutral-light mb-1">Customer</p>
                <p className="text-sm font-semibold text-gray-900">{paymentCustomer.customer_name}</p>
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
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">Mark as fully paid</span>
                </label>
              </div>

              {!paymentFullyPaid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Amount (GH\u20B5)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={paymentCustomer.total_debt}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Partial payment via MoMo"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddDebtModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Add New Debt</h3>
              <button
                onClick={() => setShowAddDebtModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddDebt} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                <select
                  value={addDebtCustomerId}
                  onChange={(e) => setAddDebtCustomerId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
                >
                  <option value="">Select a customer</option>
                  {allCustomers.map((c: any) => (
                    <option key={c.customer_id ?? c.id} value={c.customer_id ?? c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (GH\u20B5) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={addDebtAmount}
                  onChange={(e) => setAddDebtAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={addDebtDueDate}
                  onChange={(e) => setAddDebtDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={addDebtNote}
                  onChange={(e) => setAddDebtNote(e.target.value)}
                  placeholder="e.g. Goods delivered on credit"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
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
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Debt Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center text-lg font-bold text-danger">
                  {detailCustomer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{detailCustomer.customer_name}</h4>
                  {detailCustomer.customer_phone && (
                    <p className="text-sm text-neutral-light">{detailCustomer.customer_phone}</p>
                  )}
                </div>
              </div>

              <div className="bg-danger-light rounded-xl p-4 mb-6">
                <p className="text-xs text-neutral-light mb-1">Total Outstanding</p>
                <p className="text-2xl font-bold text-danger">{formatCurrency(detailCustomer.total_debt)}</p>
              </div>

              {detailCustomer.debts.length > 0 ? (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">Debt Records</h5>
                  <div className="space-y-2">
                    {detailCustomer.debts.map((debt) => {
                      const overdue = !debt.is_paid && debt.due_date && isOverdue(debt.due_date)
                      const daysLeft = debt.due_date ? daysUntilDue(debt.due_date) : null
                      return (
                        <div key={debt.debt_id} className="flex items-center justify-between py-3 px-4 bg-surfaceAlt rounded-xl text-sm">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{formatCurrency(debt.amount)}</span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                debt.is_paid ? 'bg-success-light text-success' : overdue ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
                              }`}>
                                {debt.is_paid ? 'Paid' : overdue ? 'Overdue' : 'Pending'}
                              </span>
                            </div>
                            {debt.due_date && (
                              <p className="text-xs text-neutral-light mt-1">
                                Due: {new Date(debt.due_date).toLocaleDateString()}
                                {overdue && <span className="text-danger ml-1">(overdue)</span>}
                                {!overdue && !debt.is_paid && daysLeft != null && (
                                  <span className="ml-1">({daysLeft} day{daysLeft !== 1 ? 's' : ''} left)</span>
                                )}
                              </p>
                            )}
                            {debt.created_at && (
                              <p className="text-xs text-neutral-light mt-0.5">
                                Created: {new Date(debt.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-neutral-light text-center py-4">No debt records found</p>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center gap-3">
              {detailCustomer.total_debt > 0 && isAdmin && (
                <button
                  onClick={() => {
                    setShowDetailModal(false)
                    openPayment(detailCustomer)
                  }}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
                >
                  Record Payment
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && profileCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-900">Customer Profile</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {profileCustomer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{profileCustomer.customer_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {profileCustomer.customer_phone && (
                      <span className="text-sm text-neutral-light">{profileCustomer.customer_phone}</span>
                    )}
                    {profileCustomer.customer_email && (
                      <span className="text-sm text-neutral-light">| {profileCustomer.customer_email}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-warning-light rounded-xl p-4">
                  <p className="text-xs text-neutral-light mb-1">Total Borrowed</p>
                  <p className="text-lg font-bold text-warning">
                    {profileLoading ? '...' : formatCurrency(profileCustomer.debts.reduce((sum, d) => sum + (d.is_paid ? 0 : d.amount), 0))}
                  </p>
                </div>
                <div className="bg-success-light rounded-xl p-4">
                  <p className="text-xs text-neutral-light mb-1">Total Paid</p>
                  <p className="text-lg font-bold text-success">
                    {profileLoading ? '...' : formatCurrency(profileTransactions.reduce((sum, t) => sum + t.amount_paid, 0))}
                  </p>
                </div>
                <div className="bg-surfaceAlt rounded-xl p-4">
                  <p className="text-xs text-neutral-light mb-1">Transactions</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {profileLoading ? '...' : profileTransactions.length}
                  </p>
                </div>
              </div>

              {(() => {
                const unpaidDebts = profileCustomer.debts
                  .filter((d) => !d.is_paid)
                  .sort((a, b) => {
                    if (!a.due_date) return 1
                    if (!b.due_date) return -1
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                  })
                return unpaidDebts.length > 0 ? (
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span>Borrowed</span>
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">{unpaidDebts.length}</span>
                    </h5>
                    <div className="space-y-2">
                      {unpaidDebts.map((debt) => {
                        const overdue = debt.due_date && isOverdue(debt.due_date)
                        const daysLeft = debt.due_date ? daysUntilDue(debt.due_date) : null
                        return (
                          <div key={debt.debt_id} className="flex items-center justify-between py-2.5 px-3 bg-surfaceAlt rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                            <div>
                              <span className="font-medium text-gray-900">{formatCurrency(debt.amount)}</span>
                              {debt.due_date && (
                                <span className="text-xs text-neutral-light ml-2">
                                  Due {new Date(debt.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {overdue ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-danger-light text-danger">Overdue</span>
                            ) : daysLeft != null ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning">{daysLeft}d left</span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null
              })()}

              {profileLoading ? (
                <div className="py-6 text-center">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : profileTransactions.length > 0 ? (
                <div>
                  <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>Payments</span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-success-light text-success">{profileTransactions.length}</span>
                  </h5>
                  <div className="space-y-2">
                    {profileTransactions.map((txn) => (
                      <div key={txn.transaction_id} className="flex items-center justify-between py-2.5 px-3 bg-surfaceAlt rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                        <div>
                          <span className="font-medium text-success">{formatCurrency(txn.amount_paid)}</span>
                          <p className="text-xs text-neutral-light mt-0.5">
                            {new Date(txn.created_at).toLocaleDateString()} at {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {txn.note && (
                            <p className="text-xs text-neutral-light mt-0.5">{txn.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-neutral-light">No payments yet</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center gap-3">
              {profileCustomer.total_debt > 0 && isAdmin && (
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    openPayment(profileCustomer)
                  }}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
                >
                  Record Payment
                </button>
              )}
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}
    </div>
  )
}
