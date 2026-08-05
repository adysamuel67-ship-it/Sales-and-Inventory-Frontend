'use client'

import { useMemo, useState } from 'react'
import { reminderAPI } from '@/lib/api'
import { parseApiError } from '@/lib/utils'

export interface ReminderDebt {
  debt_id: number
  amount: number
  due_date: string
  is_paid: boolean
}

export interface ReminderCustomer {
  customer_id: number
  customer_name: string
  customer_phone?: string
  debts: ReminderDebt[]
}

interface Props {
  businessId: number
  customer: ReminderCustomer
  defaultDebtId?: number
  onClose: () => void
  onScheduled?: (customerName: string) => void
}

export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayDateString(): string {
  return toDateString(new Date())
}

export function defaultReminderWindow(dueDate: string): { start: string; end: string } {
  const datePart = (dueDate || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const today = todayDateString()
    return { start: today, end: today }
  }
  const end = new Date(datePart + 'T00:00:00')
  const start = new Date(end)
  start.setDate(start.getDate() - 3)
  return { start: toDateString(start), end: toDateString(end) }
}

export function compareDates(a: string, b: string): number {
  return new Date(a.slice(0, 10) + 'T00:00:00').getTime() - new Date(b.slice(0, 10) + 'T00:00:00').getTime()
}

export interface WindowValidation {
  error?: string
  warning?: string
  ended: boolean
}

export function validateReminderWindow(start: string, end: string, today: string): WindowValidation {
  const result: WindowValidation = { ended: false }
  if (!start || !end) return result
  if (compareDates(end, start) < 0) {
    result.error = 'End date must be on or after the start date'
    return result
  }
  const windowMs = compareDates(end, start)
  const windowDays = Math.round(windowMs / (1000 * 60 * 60 * 24)) + 1
  if (windowDays > 90) {
    result.error = 'Reminder window cannot exceed 90 days'
    return result
  }
  if (windowDays > 30) {
    result.warning = `Reminder window is ${windowDays} days — longer than the recommended 30`
  }
  if (compareDates(end, today) < 0) {
    result.ended = true
  }
  return result
}

export function buildSmsPreview(opts: { customerName: string; amount: number; endDate: string; note: string }): string {
  const firstName = (opts.customerName || '').trim().split(/\s+/)[0] || 'there'
  const amount = Number(opts.amount || 0).toFixed(2)
  const base = `Hello ${firstName}, this is a friendly reminder about your outstanding balance of GHS ${amount} due on ${opts.endDate}.`
  const note = (opts.note || '').trim()
  return note ? `${base} ${note}` : base
}

export function smsPartsCount(text: string): number {
  const len = text.length
  if (len <= 0) return 1
  if (len <= 160) return 1
  return Math.ceil(len / 153)
}

export default function ScheduleReminderModal({ businessId, customer, defaultDebtId, onClose, onScheduled }: Props) {
  const outstandingDebts = useMemo(
    () => customer.debts.filter((d) => !d.is_paid && Number(d.amount) > 0),
    [customer.debts]
  )

  const [selectedDebtId, setSelectedDebtId] = useState<string>(() => {
    const preferred = outstandingDebts.find((d) => d.debt_id === defaultDebtId)
    const initial = preferred || outstandingDebts[0]
    return initial ? String(initial.debt_id) : ''
  })

  const [startDate, setStartDate] = useState<string>(() => {
    const preferred = outstandingDebts.find((d) => d.debt_id === defaultDebtId)
    const initial = preferred || outstandingDebts[0]
    return initial?.due_date ? defaultReminderWindow(initial.due_date).start : todayDateString()
  })

  const [endDate, setEndDate] = useState<string>(() => {
    const preferred = outstandingDebts.find((d) => d.debt_id === defaultDebtId)
    const initial = preferred || outstandingDebts[0]
    return initial?.due_date ? defaultReminderWindow(initial.due_date).end : todayDateString()
  })

  const [timeOfDay, setTimeOfDay] = useState('09:00')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPastConfirm, setShowPastConfirm] = useState(false)

  const selectedDebt = outstandingDebts.find((d) => String(d.debt_id) === selectedDebtId)

  const windowValidation = useMemo(
    () => validateReminderWindow(startDate, endDate, todayDateString()),
    [startDate, endDate]
  )

  const smsPreview = useMemo(
    () => buildSmsPreview({
      customerName: customer.customer_name,
      amount: selectedDebt?.amount ?? 0,
      endDate,
      note,
    }),
    [customer.customer_name, selectedDebt?.amount, endDate, note]
  )

  const smsParts = smsPartsCount(smsPreview)
  const hasPhone = !!customer.customer_phone?.trim()

  const formatAmount = (amount: number) =>
    `GH₵${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleDebtChange = (value: string) => {
    setSelectedDebtId(value)
    const debt = outstandingDebts.find((d) => String(d.debt_id) === value)
    if (debt?.due_date) {
      const { start, end } = defaultReminderWindow(debt.due_date)
      setStartDate(start)
      setEndDate(end)
    }
  }

  const resetForm = () => {
    setNote('')
    setTimeOfDay('09:00')
    const debt = outstandingDebts.find((d) => String(d.debt_id) === selectedDebtId) || outstandingDebts[0]
    if (debt?.due_date) {
      const { start, end } = defaultReminderWindow(debt.due_date)
      setStartDate(start)
      setEndDate(end)
    } else {
      setStartDate(todayDateString())
      setEndDate(todayDateString())
    }
  }

  const doSchedule = async () => {
    if (!businessId || !selectedDebt) return
    setSubmitting(true)
    setError('')
    try {
      await reminderAPI.create(businessId, {
        debt_id: selectedDebt.debt_id,
        customer_id: customer.customer_id,
        start_date: startDate,
        end_date: endDate,
        time_of_day: timeOfDay,
        note: note.trim(),
      })
      onScheduled?.(customer.customer_name)
      resetForm()
    } catch (err: any) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDebt || submitting) return
    setError('')
    const v = validateReminderWindow(startDate, endDate, todayDateString())
    if (v.error) {
      setError(v.error)
      return
    }
    if (v.ended) {
      setShowPastConfirm(true)
      return
    }
    doSchedule()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900">Schedule Reminder</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {outstandingDebts.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 bg-success-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Debt settled</p>
            <p className="text-xs text-neutral-light">
              {customer.customer_name} has no outstanding debt to remind about.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
            <div className="bg-surfaceAlt rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {customer.customer_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{customer.customer_name}</p>
                  {customer.customer_phone && (
                    <p className="text-xs text-neutral-light mt-0.5">{customer.customer_phone}</p>
                  )}
                </div>
              </div>
              {!hasPhone && (
                <div className="mt-3 bg-warning-light text-warning text-xs sm:text-sm p-3 rounded-xl flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  No phone on file — SMS won&apos;t be delivered
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Debt / Amount *</label>
              <select
                value={selectedDebtId}
                onChange={(e) => handleDebtChange(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white min-h-[44px]"
              >
                {outstandingDebts.map((debt) => (
                  <option key={debt.debt_id} value={debt.debt_id}>
                    {formatAmount(debt.amount)}
                    {debt.due_date ? ` · Due ${new Date(debt.due_date.slice(0, 10) + 'T00:00:00').toLocaleDateString()}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Time of Day</label>
              <input
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[44px]"
              />
              <p className="text-[11px] text-neutral-light mt-1">Used when the reminder fires today (defaults 09:00).</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <span className={`text-[11px] ${note.length > 150 ? 'text-danger' : 'text-neutral-light'}`}>
                  {note.length}/150
                </span>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={150}
                rows={2}
                placeholder="e.g. Friendly follow-up on your balance"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              />
            </div>

            <div className="bg-surfaceAlt rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-neutral-light shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
                <p className="text-xs font-medium text-neutral-light uppercase tracking-wider">SMS Preview</p>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${smsParts > 1 ? 'bg-warning-light text-warning' : 'bg-success-light text-success'}`}>
                  {smsParts} SMS
                </span>
                <span className="text-[11px] text-neutral-light">{smsPreview.length} chars</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 p-3 text-sm text-gray-700 leading-relaxed">
                {smsPreview}
              </div>
            </div>

            {(error || windowValidation.error) && (
              <div className="bg-danger-light text-danger text-sm p-3 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error || windowValidation.error}
              </div>
            )}

            {!error && !windowValidation.error && windowValidation.warning && (
              <div className="bg-warning-light text-warning text-sm p-3 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {windowValidation.warning}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || outstandingDebts.length === 0}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {submitting ? 'Scheduling...' : 'Schedule Reminder'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {showPastConfirm && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-20" onClick={() => setShowPastConfirm(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-warning-light rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-warning" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-gray-900 text-center mb-1">This reminder window already ended</h4>
            <p className="text-sm text-neutral-light text-center mb-5">
              The window runs {startDate} to {endDate}, so no SMS will go out. You can still schedule it, or go back and adjust the dates.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPastConfirm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setShowPastConfirm(false)
                  doSchedule()
                }}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
              >
                Schedule Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
