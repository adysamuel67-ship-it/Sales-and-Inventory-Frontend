'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { reminderAPI, customerAPI, debtAPI, adminAPI } from '@/lib/api'
import { extractArray, parseApiError, isAdminRole } from '@/lib/utils'
import ScheduleReminderModal, { ReminderCustomer, todayDateString, validateReminderWindow } from '@/components/ScheduleReminderModal'

interface Reminder {
  reminder_id: number
  debt_id: number
  business_id: number
  customer_id: number
  start_date?: string
  end_date?: string
  time_of_day?: string
  note?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

interface CustomerInfo {
  customer_id: number
  name: string
  phone?: string
}

interface DebtInfo {
  debt_id: number
  customer_id: number
  amount: number
  due_date?: string
  is_paid?: boolean
}

interface CustomerTransaction {
  transaction_id: number
  debt_id: number
  performer_id: number
  amount_paid: number
  note?: string
  created_at: string
}

type Tab = 'all' | 'active' | 'paused'

interface Props {
  businessId: number
}

function dateOnly(value?: string): string {
  const part = (value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : ''
}

function formatTime(value?: string): string {
  const v = (value || '').trim()
  if (!v) return '09:00'
  return v.slice(0, 5)
}

function daysUntil(dateStr?: string): number | null {
  const part = dateOnly(dateStr)
  if (!part) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(part + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatCurrency(amount: number) {
  return `GH\u20B5${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RemindersSection({ businessId }: Props) {
  const { user } = useAuth()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [customers, setCustomers] = useState<CustomerInfo[]>([])
  const [debts, setDebts] = useState<DebtInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editTime, setEditTime] = useState('09:00')
  const [editNote, setEditNote] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [savingEdit, setSavingEdit] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<Reminder | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [showPicker, setShowPicker] = useState(false)
  const [scheduleCustomer, setScheduleCustomer] = useState<ReminderCustomer | null>(null)

  const [memberMap, setMemberMap] = useState<Map<number, string>>(new Map())
  const [detailReminder, setDetailReminder] = useState<Reminder | null>(null)
  const [detailData, setDetailData] = useState<CustomerTransaction[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canManage = isAdminRole(user?.business_role || user?.role) || user?.business_role === 'cashier' || user?.role === 'cashier'

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

  const loadAll = useCallback(async () => {
    if (!businessId || isNaN(businessId)) return
    setLoading(true)
    setError('')
    try {
      const [remRes, custRes, debtRes] = await Promise.allSettled([
        reminderAPI.list(businessId),
        customerAPI.list(businessId),
        debtAPI.listCustomersWithDebt(businessId),
      ])

      if (remRes.status === 'fulfilled') {
        setReminders(extractArray(remRes.value.data).map((r: any) => ({
          reminder_id: r.reminder_id ?? r.id,
          debt_id: r.debt_id,
          business_id: r.business_id,
          customer_id: r.customer_id,
          start_date: r.start_date,
          end_date: r.end_date,
          time_of_day: r.time_of_day,
          note: r.note,
          is_active: r.is_active !== false,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })))
      } else {
        setError(parseApiError(remRes.reason?.response ? remRes.reason : { message: 'Failed to load reminders' }))
      }

      if (custRes.status === 'fulfilled') {
        setCustomers(extractArray(custRes.value.data).map((c: any) => ({
          customer_id: c.customer_id ?? c.id,
          name: c.name || `Customer #${c.customer_id ?? c.id}`,
          phone: c.phone,
        })))
      }

      if (debtRes.status === 'fulfilled') {
        const rows: DebtInfo[] = []
        for (const item of extractArray(debtRes.value.data)) {
          const debt = item.debt || item
          const debtId = debt.debt_id ?? debt.id
          if (debtId == null) continue
          rows.push({
            debt_id: debtId,
            customer_id: Number(debt.customer_id ?? item.customer_id ?? item.user_id ?? item.id),
            amount: Number(debt.amount ?? item.customer_debt ?? item.amount ?? 0),
            due_date: debt.due_date,
            is_paid: debt.is_paid ?? false,
          })
        }
        setDebts(rows)
      }
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    if (businessId) loadAll()
  }, [businessId, loadAll])

  useEffect(() => {
    if (!businessId || isNaN(businessId)) return
    adminAPI.listMembers()
      .then((res) => {
        const map = new Map<number, string>()
        for (const m of extractArray(res.data)) {
          const uid = Number(m.user_id ?? m.id)
          if (uid) map.set(uid, m.name || `Staff #${uid}`)
        }
        setMemberMap(map)
      })
      .catch(() => {})
  }, [businessId])

  const customerMap = useMemo(() => {
    const map = new Map<number, CustomerInfo>()
    for (const c of customers) map.set(c.customer_id, c)
    return map
  }, [customers])

  const debtMap = useMemo(() => {
    const map = new Map<number, DebtInfo>()
    for (const d of debts) map.set(d.debt_id, d)
    return map
  }, [debts])

  const getCustomer = (reminder: Reminder) => customerMap.get(reminder.customer_id)

  const stats = useMemo(() => {
    const total = reminders.length
    const active = reminders.filter((r) => r.is_active).length
    const paused = reminders.filter((r) => !r.is_active).length
    const endingSoon = reminders.filter((r) => {
      if (!r.is_active) return false
      const days = daysUntil(r.end_date)
      return days != null && days >= 0 && days <= 7
    }).length
    return { total, active, paused, endingSoon }
  }, [reminders])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reminders.filter((r) => {
      if (activeTab === 'active' && !r.is_active) return false
      if (activeTab === 'paused' && r.is_active) return false
      if (!q) return true
      const cust = customerMap.get(r.customer_id)
      return (
        cust?.name?.toLowerCase().includes(q) ||
        cust?.phone?.toLowerCase().includes(q) ||
        r.note?.toLowerCase().includes(q)
      )
    })
  }, [reminders, activeTab, search, customerMap])

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setEditStart(dateOnly(reminder.start_date) || todayDateString())
    setEditEnd(dateOnly(reminder.end_date) || todayDateString())
    setEditTime(formatTime(reminder.time_of_day))
    setEditNote(reminder.note || '')
    setEditActive(reminder.is_active)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReminder) return
    const validation = validateReminderWindow(editStart, editEnd, todayDateString())
    if (validation.error) {
      setError(validation.error)
      return
    }
    setSavingEdit(true)
    setError('')
    try {
      await reminderAPI.update(businessId, editingReminder.reminder_id, {
        start_date: editStart,
        end_date: editEnd,
        time_of_day: editTime,
        note: editNote.trim(),
        is_active: editActive,
      })
      setEditingReminder(null)
      showSuccess('Reminder updated!')
      loadAll()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleToggle = async (reminder: Reminder) => {
    setTogglingId(reminder.reminder_id)
    setError('')
    try {
      await reminderAPI.toggleActive(businessId, reminder.reminder_id, !reminder.is_active)
      showSuccess(reminder.is_active ? 'Reminder paused' : 'Reminder resumed')
      loadAll()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    setError('')
    try {
      await reminderAPI.delete(businessId, deleteConfirm.reminder_id)
      setDeleteConfirm(null)
      showSuccess('Reminder deleted')
      loadAll()
    } catch (err: any) {
      setError(parseApiError(err))
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const customersWithDebt = useMemo(() => {
    const map = new Map<number, ReminderCustomer>()
    for (const d of debts) {
      if (d.is_paid || !d.customer_id) continue
      const existing = map.get(d.customer_id)
      const cust = customerMap.get(d.customer_id)
      const entry: ReminderCustomer = existing || {
        customer_id: d.customer_id,
        customer_name: cust?.name || `Customer #${d.customer_id}`,
        customer_phone: cust?.phone,
        debts: [],
      }
      entry.debts.push({ debt_id: d.debt_id, amount: d.amount, due_date: d.due_date || '', is_paid: false })
      map.set(d.customer_id, entry)
    }
    return Array.from(map.values())
  }, [debts, customerMap])

  const openSchedule = (customer: ReminderCustomer) => {
    setShowPicker(false)
    setScheduleCustomer(customer)
  }

  const openDetail = async (reminder: Reminder) => {
    setDetailReminder(reminder)
    setDetailData(null)
    setDetailLoading(true)
    try {
      const res = await debtAPI.getCustomerTransactions(businessId, reminder.customer_id)
      const txns = extractArray(res.data).map((item: any) => {
        const t = item.transactions || item
        return {
          transaction_id: t.transaction_id ?? item.transaction_id,
          debt_id: t.debt_id ?? item.debt_id,
          performer_id: t.performer_id ?? item.performer_id,
          amount_paid: Number(t.amount_paid ?? item.amount_paid ?? 0),
          note: t.note || item.note || '',
          created_at: t.created_at || item.created_at || '',
        }
      })
      setDetailData(txns)
    } catch {
      setDetailData([])
    } finally {
      setDetailLoading(false)
    }
  }

  const detailDebt = detailReminder ? debtMap.get(detailReminder.debt_id) : null
  const detailCustomer = detailReminder ? getCustomer(detailReminder) : null
  const detailDebtStatus = (() => {
    if (!detailDebt) return null
    if (detailDebt.is_paid) return { label: 'Paid', cls: 'bg-success-light text-success' }
    const days = daysUntil(detailDebt.due_date)
    if (days != null && days < 0) return { label: 'Overdue', cls: 'bg-danger-light text-danger' }
    return { label: 'Pending', cls: 'bg-warning-light text-warning' }
  })()
  const detailCreator = (() => {
    if (!detailReminder || !detailData) return null
    const debtTxns = detailData.filter((t) => t.debt_id === detailReminder.debt_id)
    const created = debtTxns.find((t) => t.amount_paid === 0) || debtTxns[0]
    if (!created || created.performer_id == null) return null
    return {
      name: memberMap.get(created.performer_id) || `Staff #${created.performer_id}`,
      created_at: created.created_at,
    }
  })()

  const editValidation = useMemo(
    () => validateReminderWindow(editStart, editEnd, todayDateString()),
    [editStart, editEnd]
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Payment Reminders</h2>
          <p className="text-xs sm:text-sm text-neutral-light mt-0.5">Automated SMS reminders for customer debt payments</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowPicker(true)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Reminder
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Total</p>
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Active</p>
                <div className="w-8 h-8 rounded-xl bg-success-light flex items-center justify-center">
                  <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </div>
            <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Paused</p>
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-500">{stats.paused}</p>
            </div>
            <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-neutral-light uppercase tracking-wider">Ending Soon</p>
                <div className="w-8 h-8 rounded-xl bg-warning-light flex items-center justify-center">
                  <svg className="w-4 h-4 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-2xl font-bold text-warning">{stats.endingSoon}</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {([
                { key: 'all' as Tab, label: `All (${stats.total})` },
                { key: 'active' as Tab, label: `Active (${stats.active})` },
                { key: 'paused' as Tab, label: `Paused (${stats.paused})` },
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
            <div className="relative flex-1 w-full lg:max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer, phone, or note..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm">
            {filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-neutral-light uppercase tracking-wider border-b border-gray-200">
                      <th className="text-left px-5 py-3 font-medium">Customer</th>
                      <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Amount</th>
                      <th className="text-left px-5 py-3 font-medium">Window</th>
                      <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Note</th>
                      <th className="text-center px-5 py-3 font-medium">Status</th>
                      <th className="text-right px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((reminder) => {
                      const cust = getCustomer(reminder)
                      const debt = debtMap.get(reminder.debt_id)
                      const endDays = daysUntil(reminder.end_date)
                      return (
                        <tr
                          key={reminder.reminder_id}
                          onClick={() => openDetail(reminder)}
                          className="border-t border-gray-50 table-row-hover cursor-pointer"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                                reminder.is_active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {cust?.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{cust?.name || 'Unknown'}</div>
                                {cust?.phone && <div className="text-xs text-neutral-light mt-0.5">{cust.phone}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {debt ? (
                              <span className="font-semibold text-gray-900">{formatCurrency(debt.amount)}</span>
                            ) : (
                              <span className="text-neutral-light">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-gray-700">
                              {dateOnly(reminder.start_date) || '—'} <span className="text-neutral-light">→</span> {dateOnly(reminder.end_date) || '—'}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-neutral-light">Daily {formatTime(reminder.time_of_day)}</span>
                              {reminder.is_active && endDays != null && endDays >= 0 && endDays <= 7 && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning-light text-warning">
                                  {endDays === 0 ? 'Ends today' : `${endDays}d left`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <span className="text-gray-600 line-clamp-2 max-w-[220px]">{reminder.note || '—'}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              reminder.is_active ? 'bg-success-light text-success' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {reminder.is_active ? 'Active' : 'Paused'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                              {canManage && (
                                <>
                                  <button
                                    onClick={() => openEdit(reminder)}
                                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleToggle(reminder)}
                                    disabled={togglingId === reminder.reminder_id}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                                      reminder.is_active
                                        ? 'text-warning bg-warning-light hover:bg-warning/10'
                                        : 'text-success bg-success-light hover:bg-success/10'
                                    }`}
                                  >
                                    {togglingId === reminder.reminder_id ? '...' : reminder.is_active ? 'Pause' : 'Resume'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(reminder)}
                                    className="px-2.5 py-1 text-xs font-medium text-danger bg-danger-light rounded-lg hover:bg-danger/10 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {search ? 'No reminders match your search' : 'No reminders yet'}
                </p>
                <p className="text-xs text-neutral-light">
                  {search
                    ? 'Try a different search term'
                    : activeTab === 'active' ? 'No active reminders' : activeTab === 'paused' ? 'No paused reminders' : 'Schedule your first debt reminder to get started'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {showPicker && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <div>
                <h3 className="font-semibold text-gray-900">Schedule a Reminder</h3>
                <p className="text-xs text-neutral-light mt-0.5">Choose a customer with an outstanding balance</p>
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 overflow-y-auto">
              {customersWithDebt.length > 0 ? (
                <div className="space-y-2">
                  {customersWithDebt.map((c) => {
                    const total = c.debts.reduce((sum, d) => sum + Number(d.amount || 0), 0)
                    return (
                      <button
                        key={c.customer_id}
                        onClick={() => openSchedule(c)}
                        className="w-full flex items-center gap-3 p-3 bg-surfaceAlt rounded-xl hover:bg-gray-200/60 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                          {c.customer_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.customer_name}</p>
                          {c.customer_phone && <p className="text-xs text-neutral-light mt-0.5">{c.customer_phone}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-danger">{formatCurrency(total)}</p>
                          <p className="text-[10px] text-neutral-light">{c.debts.length} debt{c.debts.length !== 1 ? 's' : ''}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 bg-success-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No outstanding debts</p>
                  <p className="text-xs text-neutral-light">All customer debts are settled — nothing to remind about.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {scheduleCustomer && (
        <ScheduleReminderModal
          businessId={businessId}
          customer={scheduleCustomer}
          onClose={() => setScheduleCustomer(null)}
          onScheduled={(name) => {
            setScheduleCustomer(null)
            showSuccess(`Reminder scheduled for ${name}`)
            loadAll()
          }}
        />
      )}

      {editingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { if (!savingEdit) setEditingReminder(null) }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-900">Edit Reminder</h3>
              <button
                onClick={() => setEditingReminder(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="px-4 sm:px-6 py-5 space-y-4">
              <div className="bg-surfaceAlt rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {getCustomer(editingReminder)?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{getCustomer(editingReminder)?.name || 'Unknown'}</p>
                    {getCustomer(editingReminder)?.phone && (
                      <p className="text-xs text-neutral-light mt-0.5">{getCustomer(editingReminder)?.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date *</label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Time of Day</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Note</label>
                  <span className={`text-[11px] ${editNote.length > 150 ? 'text-danger' : 'text-neutral-light'}`}>
                    {editNote.length}/150
                  </span>
                </div>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  maxLength={150}
                  rows={2}
                  placeholder="e.g. Friendly follow-up on your balance"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                />
              </div>

              <label className="flex items-center gap-3 bg-surfaceAlt rounded-xl px-4 py-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${editActive ? 'bg-success' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${editActive ? 'translate-x-5 ml-0.5' : 'translate-x-0.5 ml-0'}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{editActive ? 'Active' : 'Paused'}</p>
                  <p className="text-xs text-neutral-light">Paused reminders will not send any SMS.</p>
                </div>
              </label>

              {(error || editValidation.error) && (
                <div className="bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error || editValidation.error}
                </div>
              )}

              {!error && !editValidation.error && editValidation.warning && (
                <div className="bg-warning-light text-warning text-sm p-3 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {editValidation.warning}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReminder(null)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailReminder(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-900">Reminder Details</h3>
              <button onClick={() => setDetailReminder(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 sm:px-6 py-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary shrink-0">
                  {detailCustomer?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-light">Borrower</p>
                  <p className="text-lg font-semibold text-gray-900 truncate">{detailCustomer?.name || 'Unknown'}</p>
                  {detailCustomer?.phone && <p className="text-xs text-neutral-light mt-0.5">{detailCustomer.phone}</p>}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-light uppercase tracking-wider mb-3">Debt</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surfaceAlt rounded-xl p-4">
                    <p className="text-xs text-neutral-light mb-1">Amount</p>
                    <p className="text-lg font-bold text-gray-900">{detailDebt ? formatCurrency(detailDebt.amount) : '—'}</p>
                  </div>
                  <div className="bg-surfaceAlt rounded-xl p-4">
                    <p className="text-xs text-neutral-light mb-1">Status</p>
                    {detailDebtStatus ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${detailDebtStatus.cls}`}>
                        {detailDebtStatus.label}
                      </span>
                    ) : '—'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-surfaceAlt rounded-xl p-4">
                    <p className="text-xs text-neutral-light mb-1">Due Date</p>
                    <p className="text-sm font-medium text-gray-900">{detailDebt?.due_date ? dateOnly(detailDebt.due_date) : '—'}</p>
                  </div>
                  <div className="bg-surfaceAlt rounded-xl p-4">
                    <p className="text-xs text-neutral-light mb-1">Debt ID</p>
                    <p className="text-sm font-medium text-gray-900">#{detailReminder.debt_id}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-light uppercase tracking-wider mb-3">Added By</h4>
                <div className="bg-surfaceAlt rounded-xl p-4">
                  {detailLoading ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-light">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  ) : detailCreator ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{detailCreator.name}</p>
                      {detailCreator.created_at && (
                        <p className="text-xs text-neutral-light mt-0.5">
                          Added {new Date(detailCreator.created_at).toLocaleDateString()} at{' '}
                          {new Date(detailCreator.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-light">Not available for this debt</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-neutral-light uppercase tracking-wider mb-3">Reminder</h4>
                <div className="bg-surfaceAlt rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-light">Window</span>
                    <span className="text-gray-900 font-medium">{dateOnly(detailReminder.start_date) || '—'} → {dateOnly(detailReminder.end_date) || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-light">Time</span>
                    <span className="text-gray-900 font-medium">Daily {formatTime(detailReminder.time_of_day)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-light">Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${detailReminder.is_active ? 'bg-success-light text-success' : 'bg-gray-200 text-gray-600'}`}>
                      {detailReminder.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {detailReminder.note && (
                    <div className="text-sm">
                      <span className="text-neutral-light block mb-0.5">Note</span>
                      <p className="text-gray-700">{detailReminder.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 rounded-b-2xl">
              <button onClick={() => setDetailReminder(null)} className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { if (!deleting) setDeleteConfirm(null) }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-danger-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-1">Delete this reminder?</h3>
            <p className="text-sm text-neutral-light text-center mb-5">
              The reminder for <strong>{getCustomer(deleteConfirm)?.name || 'Unknown'}</strong> will be permanently removed and no longer send SMS.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors min-h-[44px] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
