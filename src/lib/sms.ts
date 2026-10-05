/**
 * SMS domain logic — mirrors the backend scheduler so the UI never guesses.
 *
 * Two independent SMS pipelines exist server-side:
 *
 * 1. Debt reminders — `src/tasks/debt_reminders.py`. One message per
 *    `Reminders` row, addressed to the borrower.
 * 2. Automated sales reports — `src/tasks/reciept.py` + `src/tasks/jobs.py`.
 *    Business summaries pushed to every admin/manager's phone on a schedule.
 *    This is what the "SMS Reports" screen shows.
 *
 * The report schedule below is a transcription of the CronTriggers in
 * `start_report_schedulers()`. Debt-reminder delivery state comes from the API.
 */

import { addDays, compareDateKeys, dateKey, todayDateKey } from '@/lib/dates'

// ── Segment maths ───────────────────────────────────────────────────────────
// GSM-7 alphabet. A single part carries 160 characters; once the message runs
// over, every part (including the last) carries 153 because the 8-bit UDH
// length field eats into each segment payload.
export const SMS_SINGLE_PART = 160
export const SMS_MULTI_PART = 153

export function smsSegments(text: string): number {
  const len = (text || '').length
  if (len <= SMS_SINGLE_PART) return 1
  return Math.ceil(len / SMS_MULTI_PART)
}

/**
 * Ghanaian prepaid SMS billing: segments are charged per part, not per
 * character, so the second part costs as much as the first.
 */
export function smsCostGhs(parts: number, unitPrice = 0.01): number {
  return Number(((parts || 0) * unitPrice).toFixed(2))
}

// ── Report schedules ────────────────────────────────────────────────────────

export type ReportKind = 'daily' | 'weekly' | 'monthly'

export interface ReportSchedule {
  kind: ReportKind
  label: string
  /** Verbatim from `process_report_data(..., title)` in `src/tasks/jobs.py`. */
  smsTitle: string
  cadence: string
  sendAtUtc: string
}

export const REPORT_SCHEDULES: ReportSchedule[] = [
  {
    kind: 'daily',
    label: 'Daily',
    smsTitle: 'Daily Sales Summary',
    cadence: 'Every day at 19:00 UTC',
    sendAtUtc: '19:00',
  },
  {
    kind: 'weekly',
    label: 'Weekly',
    smsTitle: 'Weekly Performance Overview',
    cadence: 'Every Sunday at 19:00 UTC',
    sendAtUtc: '19:00',
  },
  {
    kind: 'monthly',
    label: 'Monthly',
    smsTitle: 'Monthly Revenue Report',
    cadence: '1st of each month at 19:00 UTC',
    sendAtUtc: '19:00',
  },
]

export function reportSchedule(kind: ReportKind): ReportSchedule {
  return REPORT_SCHEDULES.find((s) => s.kind === kind) || REPORT_SCHEDULES[0]
}

// ── Reporting window ────────────────────────────────────────────────────────
// The scheduler works entirely in UTC. These helpers reproduce
// `daily_report_dates()`, `weekly_report_dates()` and `monthly_report_dates()`
// so the preview covers exactly the range that gets summarised.

function toUTCDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function shiftUTCDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return toUTCDateString(d)
}

export interface ReportWindow {
  start: string
  end: string
}

/** `now` is injectable so the window maths is testable without a frozen clock. */
export function reportWindow(kind: ReportKind, now: Date = new Date()): ReportWindow {
  const today = toUTCDateString(now)

  if (kind === 'daily') {
    return { start: today, end: today }
  }

  if (kind === 'weekly') {
    return { start: shiftUTCDate(today, -7), end: today }
  }

  // Monthly covers the 1st of the current month up to today. The backend
  // computes "last day of previous month" only to rewind it back to day 1.
  const firstOfMonth = today.slice(0, 8) + '01'
  return { start: firstOfMonth, end: today }
}

// ── Message rendering ───────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseUTC(dateStr: string): { month: number; day: number; year: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '')
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/** Python `strftime('%b %d')` → "Oct 03". Day is zero-padded. */
export function formatReportStart(dateStr: string): string {
  const p = parseUTC(dateStr)
  if (!p) return dateStr || ''
  return `${MONTH_ABBR[p.month - 1]} ${String(p.day).padStart(2, '0')}`
}

/** Python `strftime('%b %d, %Y')` → "Oct 03, 2026". */
export function formatReportEnd(dateStr: string): string {
  const p = parseUTC(dateStr)
  if (!p) return dateStr || ''
  return `${MONTH_ABBR[p.month - 1]} ${String(p.day).padStart(2, '0')}, ${p.year}`
}

/**
 * Python `f"{amount:,.2f}"` → thousands separator, exactly two decimals.
 * Guards null/NaN, which the backend coerces to 0.00.
 */
/** The summary fields the SMS report reads. Mirrors backend `SaleSummary`. */
export interface ReportSummary {
  total_revenue?: number | null
  total_profit?: number | null
  total_sales?: number | null
  sold_quantity?: number | null
  cash_total?: number | null
  momo_total?: number | null
  card_total?: number | null
  best_selling_product?: string | null
}

/**
 * Byte-for-byte port of `RecieptReportGenerator.build_analytics_message()`.
 *
 * If the backend template changes, this changes with it — a live preview is the
 * only honest way to show an owner what they will actually receive.
 */
export function buildReportSms(opts: {
  summary: ReportSummary
  start: string
  end: string
  title: string
}): string {
  const { summary, start, end, title } = opts
  const best = summary.best_selling_product || 'N/A'

  return (
    `AUTOMATED REPORT\n` +
    `${title} | ${formatReportStart(start)} - ${formatReportEnd(end)}\n` +
    `\n` +
    `Total Revenue: GHS ${formatSmsAmount(summary.total_revenue)}\n` +
    `Total Profit: GHS ${formatSmsAmount(summary.total_profit)}\n` +
    `Total Orders: ${formatSmsCount(summary.total_sales)}\n` +
    `Units Sold: ${formatSmsCount(summary.sold_quantity)}\n` +
    `\n` +
    `Payment breakdown\n` +
    `Cash: ${formatSmsCount(summary.cash_total)}\n` +
    `Mobile money: ${formatSmsCount(summary.momo_total)}\n` +
    `Card: ${formatSmsCount(summary.card_total)}\n` +
    `\n` +
    `Best selling product: ${best}\n` +
    `\n` +
    `This is an automated report from your Sales Tracker.`
  )
}

// ── Reminder delivery state ─────────────────────────────────────────────────

export type ReminderDeliveryState =
  | 'scheduled'
  | 'due'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'paused'
  | 'settled'

export interface ReminderForDelivery {
  date?: string | null
  time_of_day?: string | null
  is_active?: boolean
  sent_at?: string | null
  status?: string | null
  attempts?: number | null
}

/**
 * Delivery state for a reminder.
 *
 * `status` and `attempts` come straight from the `Reminders` row, so a failed
 * send is reported as failed instead of looking like one that simply has not
 * fired yet. `sent_at` still wins when it is set, because the backend stamps it
 * in the same transaction that writes status='sent'.
 *
 * Everything else is derived from what the API exposes plus whether the debt was
 * settled: an active, unsent reminder whose UTC date has arrived reads as due so
 * a shopkeeper can chase it instead of waiting on a send that already failed.
 */
export function deriveReminderDelivery(
  reminder: ReminderForDelivery,
  opts: { debtSettled?: boolean; status?: string | null } = {},
  now: Date = new Date()
): ReminderDeliveryState {
  if (reminder.sent_at) return 'sent'
  if (opts.debtSettled) return 'settled'

  const rawStatus = (opts.status || reminder.status || '').toLowerCase()
  if (rawStatus === 'sent') return 'sent'
  if (rawStatus === 'sending') return 'sending'
  if (rawStatus === 'failed') return 'failed'

  if (reminder.is_active === false) return 'paused'

  const datePart = dateKey(reminder.date)
  if (!datePart) return 'scheduled'

  return compareDateKeys(datePart, todayDateKey(now)) <= 0 ? 'due' : 'scheduled'
}

export interface DeliveryMeta {
  label: string
  description: string
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}

export const REMINDER_DELIVERY_META: Record<ReminderDeliveryState, DeliveryMeta> = {
  scheduled: {
    label: 'Scheduled',
    description: 'Waiting for its date to arrive.',
    tone: 'neutral',
  },
  due: {
    label: 'Due now',
    description: 'The date has passed but no send was recorded. Check the scheduler.',
    tone: 'warning',
  },
  sending: {
    label: 'Sending',
    description: 'A worker has claimed this reminder and is delivering it.',
    tone: 'info',
  },
  sent: {
    label: 'Sent',
    description: 'The SMS went out. This reminder will not fire again.',
    tone: 'success',
  },
  failed: {
    label: 'Failed',
    description: 'The provider rejected the send. It retries on the next hourly run until it succeeds 3 times.',
    tone: 'danger',
  },
  paused: {
    label: 'Paused',
    description: 'Turned off by a manager. It will not fire until resumed.',
    tone: 'neutral',
  },
  settled: {
    label: 'Debt settled',
    description: 'The balance was cleared, so no reminder is needed.',
    tone: 'success',
  },
}

export function reminderDeliveryMeta(state: ReminderDeliveryState): DeliveryMeta {
  return REMINDER_DELIVERY_META[state]
}

// ── Sale edit debt terms ────────────────────────────────────────────────────

/**
 * Default due date for a debt raised while editing a sale.
 *
 * Mirrors the backend: `update_sale()` creates the Debt row itself with
 * `datetime.now(UTC) + timedelta(days=30)` when the saved amount_paid is below
 * the sale total. The UI shows the same window so the form matches what the
 * server will actually store.
 */
export function defaultDebtDueDate(from: Date = new Date()): string {
  return addDays(todayDateKey(from), 30)
}

/**
 * How much of a sale is left unpaid.
 *
 * The backend computes `debt = total_amount - amount_paid`, so anything above
 * zero becomes a Debt row. Rounded to 2dp first so binary floating point dust
 * (100 - 99.99999999999999) is not mistaken for a real shortfall.
 */
export function outstandingBalance(totalAmount: number, amountPaid: number): number {
  const balance = Number((Number(totalAmount) - Number(amountPaid)).toFixed(2))
  return balance > 0 ? balance : 0
}
export function formatSmsAmount(value: number | null | undefined): string {
  const n = Number(value)
  const safe = Number.isFinite(n) ? n : 0
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Counts (`total_sales`, `sold_quantity`, and the payment tallies) print bare
 * in the backend via f-string on an int. `SaleSummary` types them as float, so
 * a value can arrive as `12.0` and would otherwise render as "12.0".
 */
export function formatSmsCount(value: number | null | undefined): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : '0'
}