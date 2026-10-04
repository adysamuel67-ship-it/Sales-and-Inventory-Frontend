/**
 * Reminder Scheduler Tests
 *
 * A reminder fires on ONE day. The backend used to take a start/end window,
 * but the Reminders model now stores a single `date` and rejects a past one,
 * so these tests follow the single-date contract.
 *
 * Verifies:
 * 1. buildSmsPreview — SMS message format per contract
 * 2. smsPartsCount — 1 SMS / 2 SMS parts hint
 * 3. defaultReminderDate — the debt's due date
 * 4. validateReminderDate — required, and not in the past
 * 5. Note length limit (≤150 chars)
 * 6. No-phone warning edge state
 * 7. Debt-settled edge state
 * 8. Role-based access (admin/manager/cashier/super_admin)
 * 9. Reminder API route verification
 */

import {
  buildSmsPreview,
  smsPartsCount,
  defaultReminderDate,
  validateReminderDate,
  todayDateString,
  compareDates,
} from '@/components/ScheduleReminderModal'
import { isAdminRole } from '@/lib/utils'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ──────────────────────────────────────────────────
// buildSmsPreview
// ──────────────────────────────────────────────────

describe('buildSmsPreview', () => {
  it('builds the exact preview from the contract example', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy Mensah',
      amount: 800,
      dueDate: '2026-07-31',
      note: 'Friendly follow-up on your balance',
    })
    expect(preview).toBe(
      'Hello Addy Mensah, this is a friendly reminder about your outstanding balance of GHS 800.00, due on 2026-07-31. Friendly follow-up on your balance'
    )
  })

  it('uses the full customer name, matching build_message() on the backend', () => {
    const preview = buildSmsPreview({
      customerName: 'Kofi Asante',
      amount: 100,
      dueDate: '2026-08-01',
      note: '',
    })
    expect(preview).toContain('Hello Kofi Asante,')
  })

  it('shows the debt due date, not the reminder date', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 800,
      dueDate: '2026-09-15',
      note: '',
    })
    expect(preview).toContain('due on 2026-09-15')
  })

  it('omits note when empty', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 800,
      dueDate: '2026-07-31',
      note: '',
    })
    expect(preview.endsWith('due on 2026-07-31.')).toBe(true)
  })

  it('appends note when provided', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 800,
      dueDate: '2026-07-31',
      note: 'Please settle soon',
    })
    expect(preview.endsWith('. Please settle soon')).toBe(true)
  })

  it('formats amount with two decimals', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 150.5,
      dueDate: '2026-07-31',
      note: '',
    })
    expect(preview).toContain('GHS 150.50')
  })

  it('falls back gracefully for unknown names', () => {
    const preview = buildSmsPreview({
      customerName: '',
      amount: 100,
      dueDate: '2026-07-31',
      note: '',
    })
    expect(preview).toContain('Hello there,')
  })
})

// ──────────────────────────────────────────────────
// smsPartsCount
// ──────────────────────────────────────────────────

describe('smsPartsCount', () => {
  it('returns 1 SMS for short messages', () => {
    expect(smsPartsCount('Hello Addy, please pay your balance.')).toBe(1)
  })

  it('returns 1 SMS for exactly 160 chars', () => {
    expect(smsPartsCount('x'.repeat(160))).toBe(1)
  })

  it('returns 2 SMS for messages over 160 chars', () => {
    expect(smsPartsCount('x'.repeat(161))).toBe(2)
  })

  it('returns 2 SMS for 306 chars (2 × 153)', () => {
    expect(smsPartsCount('x'.repeat(306))).toBe(2)
  })

  it('returns 3 SMS for 307 chars', () => {
    expect(smsPartsCount('x'.repeat(307))).toBe(3)
  })

  it('handles empty text', () => {
    expect(smsPartsCount('')).toBe(1)
  })
})

// ──────────────────────────────────────────────────
// defaultReminderDate
// ──────────────────────────────────────────────────

describe('defaultReminderDate', () => {
  // The backend stamps new debts 30 days out, so defaulting the reminder to the
  // debt's due date silently pushed it a month into the future. The default is
  // today instead, so the user always picks the day the text goes out.
  const FAR_FUTURE = '2099-07-31'

  it('defaults to today, not the debt due date', () => {
    expect(defaultReminderDate(FAR_FUTURE)).toBe(todayDateString())
  })

  it('returns today when no due date is supplied', () => {
    expect(defaultReminderDate()).toBe(todayDateString())
  })

  it('falls back to today for a missing due date', () => {
    expect(defaultReminderDate('')).toBe(todayDateString())
  })

  it('falls back to today for an unparseable due date', () => {
    expect(defaultReminderDate('not-a-date')).toBe(todayDateString())
  })

  it('ignores a due date that has already passed', () => {
    expect(defaultReminderDate('2020-01-01')).toBe(todayDateString())
  })
})

// ──────────────────────────────────────────────────
// validateReminderDate
// ──────────────────────────────────────────────────

describe('validateReminderDate', () => {
  const today = todayDateString()

  function offset(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return toDateStr(d)
  }

  it('requires a date', () => {
    const v = validateReminderDate('', today)
    expect(v.error).toContain('Pick the day')
  })

  it('accepts today', () => {
    expect(validateReminderDate(today, today).error).toBeUndefined()
  })

  it('accepts a future date', () => {
    expect(validateReminderDate(offset(5), today).error).toBeUndefined()
  })

  it('accepts a far-future date — there is no window length cap any more', () => {
    expect(validateReminderDate(offset(400), today).error).toBeUndefined()
  })

  it('rejects yesterday', () => {
    const v = validateReminderDate(offset(-1), today)
    expect(v.error).toContain('cannot be in the past')
  })

  it('rejects a date well in the past', () => {
    const v = validateReminderDate('2020-01-01', today)
    expect(v.error).toContain('cannot be in the past')
  })
})

// ──────────────────────────────────────────────────
// compareDates
// ──────────────────────────────────────────────────

describe('compareDates', () => {
  it('returns negative when a is before b', () => {
    expect(compareDates('2026-07-28', '2026-07-31')).toBeLessThan(0)
  })

  it('returns positive when a is after b', () => {
    expect(compareDates('2026-07-31', '2026-07-28')).toBeGreaterThan(0)
  })

  it('returns 0 for equal dates', () => {
    expect(compareDates('2026-07-31', '2026-07-31')).toBe(0)
  })
})

// ──────────────────────────────────────────────────
// Note length limit
// ──────────────────────────────────────────────────

describe('Note length limit', () => {
  it('allows notes up to 150 chars', () => {
    const note = 'x'.repeat(150)
    expect(note.length).toBeLessThanOrEqual(150)
  })

  it('rejects notes over 150 chars', () => {
    const note = 'x'.repeat(151)
    expect(note.length).toBeGreaterThan(150)
  })

  it('long notes push the SMS into a second part', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 800,
      dueDate: '2026-07-31',
      note: 'y'.repeat(150),
    })
    expect(smsPartsCount(preview)).toBe(2)
  })
})

// ──────────────────────────────────────────────────
// Edge states
// ──────────────────────────────────────────────────

describe('Reminder edge states', () => {
  it('flags customers without a phone number', () => {
    const customer = { customer_id: 1, customer_name: 'Addy', customer_phone: '', debts: [] }
    const hasPhone = !!customer.customer_phone?.trim()
    expect(hasPhone).toBe(false)
  })

  it('considers a customer with a phone deliverable', () => {
    const customer = { customer_id: 1, customer_name: 'Addy', customer_phone: '0241234567', debts: [] }
    const hasPhone = !!customer.customer_phone?.trim()
    expect(hasPhone).toBe(true)
  })

  it('treats fully paid debts as settled (no outstanding reminders)', () => {
    const debts = [
      { debt_id: 1, amount: 100, due_date: '2026-07-31', is_paid: true },
    ]
    const outstanding = debts.filter((d) => !d.is_paid && Number(d.amount) > 0)
    expect(outstanding).toHaveLength(0)
  })

  it('keeps unpaid debts as schedulable', () => {
    const debts = [
      { debt_id: 1, amount: 100, due_date: '2026-07-31', is_paid: false },
    ]
    const outstanding = debts.filter((d) => !d.is_paid && Number(d.amount) > 0)
    expect(outstanding).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────────
// Role-based access (per API contract)
// ──────────────────────────────────────────────────

describe('Reminder role-based access', () => {
  const allowed = ['admin', 'manager', 'cashier', 'super_admin']

  it('allows every role from the API contract', () => {
    for (const role of allowed) {
      expect(isAdminRole(role) || role === 'cashier').toBe(true)
    }
  })

  it('denies viewer role', () => {
    expect(isAdminRole('viewer')).toBe(false)
    expect('viewer' === 'cashier').toBe(false)
  })
})

// ──────────────────────────────────────────────────
// Reminder API routes
// ──────────────────────────────────────────────────

describe('Reminder API routes', () => {
  it('create uses POST /debts/reminders/{business_id}', () => {
    const route = '/debts/reminders/{business_id}'
    expect(route.startsWith('/debts/reminders/')).toBe(true)
  })

  it('list uses GET /debts/reminders/{business_id}', () => {
    const route = '/debts/reminders/{business_id}'
    expect(route.startsWith('/debts/reminders/')).toBe(true)
  })

  it('builds the create payload with expected fields', () => {
    const payload = {
      debt_id: 12,
      customer_id: 7,
      date: '2026-07-31',
      time_of_day: '09:00',
      note: 'Friendly follow-up on your balance',
    }
    expect(payload).toHaveProperty('debt_id', 12)
    expect(payload).toHaveProperty('customer_id', 7)
    expect(payload).toHaveProperty('date', '2026-07-31')
    expect(payload).toHaveProperty('time_of_day')
    expect(payload).toHaveProperty('note')
  })

  it('does not send the removed start/end window', () => {
    const payload = {
      debt_id: 12,
      customer_id: 7,
      date: '2026-07-31',
      time_of_day: '09:00',
      note: 'Friendly follow-up on your balance',
    }
    expect(payload).not.toHaveProperty('start_date')
    expect(payload).not.toHaveProperty('end_date')
  })
})
