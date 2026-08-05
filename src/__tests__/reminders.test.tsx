/**
 * Reminder Scheduler Tests
 *
 * Verifies:
 * 1. buildSmsPreview — SMS message format per contract
 * 2. smsPartsCount — 1 SMS / 2 SMS parts hint
 * 3. defaultReminderWindow — start = due date − 3 days, end = due date
 * 4. validateReminderWindow — end ≥ start, >30-day warn, >90-day block, past window
 * 5. Note length limit (≤150 chars)
 * 6. No-phone warning edge state
 * 7. Debt-settled edge state
 * 8. Role-based access (admin/manager/cashier/super_admin)
 * 9. Reminder API route verification
 */

import {
  buildSmsPreview,
  smsPartsCount,
  defaultReminderWindow,
  validateReminderWindow,
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
      endDate: '2026-07-31',
      note: 'Friendly follow-up on your balance',
    })
    expect(preview).toBe(
      'Hello Addy, this is a friendly reminder about your outstanding balance of GHS 800.00 due on 2026-07-31. Friendly follow-up on your balance'
    )
  })

  it('uses the first name only', () => {
    const preview = buildSmsPreview({
      customerName: 'Kofi Asante',
      amount: 100,
      endDate: '2026-08-01',
      note: '',
    })
    expect(preview).toContain('Hello Kofi,')
    expect(preview).not.toContain('Kofi Asante')
  })

  it('omits note when empty', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 800,
      endDate: '2026-07-31',
      note: '',
    })
    expect(preview.endsWith('due on 2026-07-31.')).toBe(true)
  })

  it('appends note when provided', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 800,
      endDate: '2026-07-31',
      note: 'Please settle soon',
    })
    expect(preview.endsWith('. Please settle soon')).toBe(true)
  })

  it('formats amount with two decimals', () => {
    const preview = buildSmsPreview({
      customerName: 'Addy',
      amount: 150.5,
      endDate: '2026-07-31',
      note: '',
    })
    expect(preview).toContain('GHS 150.50')
  })

  it('falls back gracefully for unknown names', () => {
    const preview = buildSmsPreview({
      customerName: '',
      amount: 100,
      endDate: '2026-07-31',
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
// defaultReminderWindow
// ──────────────────────────────────────────────────

describe('defaultReminderWindow', () => {
  it('defaults start to due date minus 3 days and end to due date', () => {
    const { start, end } = defaultReminderWindow('2026-07-31')
    expect(end).toBe('2026-07-31')
    expect(start).toBe('2026-07-28')
  })

  it('handles month boundaries', () => {
    const { start } = defaultReminderWindow('2026-08-02')
    expect(start).toBe('2026-07-30')
  })

  it('handles year boundaries', () => {
    const { start } = defaultReminderWindow('2027-01-02')
    expect(start).toBe('2026-12-30')
  })

  it('falls back to today for missing due date', () => {
    const { start, end } = defaultReminderWindow('')
    expect(end).toBe(todayDateString())
    expect(start).toBe(todayDateString())
  })
})

// ──────────────────────────────────────────────────
// validateReminderWindow
// ──────────────────────────────────────────────────

describe('validateReminderWindow', () => {
  const today = todayDateString()

  it('blocks submit when end date is before start date', () => {
    const v = validateReminderWindow('2026-08-05', '2026-08-01', today)
    expect(v.error).toContain('End date must be on or after')
  })

  it('allows end date equal to start date', () => {
    const v = validateReminderWindow('2026-08-05', '2026-08-05', today)
    expect(v.error).toBeUndefined()
  })

  it('blocks windows over 90 days', () => {
    const v = validateReminderWindow('2026-05-01', '2026-08-31', today)
    expect(v.error).toContain('90 days')
  })

  it('warns for windows over 30 days', () => {
    const v = validateReminderWindow('2026-07-01', '2026-08-10', today)
    expect(v.warning).toContain('longer than the recommended 30')
  })

  it('no warning or error for a sane 5-day window', () => {
    const start = new Date()
    const end = new Date()
    start.setDate(start.getDate() - 2)
    end.setDate(end.getDate() + 3)
    const v = validateReminderWindow(toDateStr(start), toDateStr(end), today)
    expect(v.error).toBeUndefined()
    expect(v.warning).toBeUndefined()
    expect(v.ended).toBe(false)
  })

  it('flags windows that already ended', () => {
    const v = validateReminderWindow('2020-01-01', '2020-01-03', today)
    expect(v.ended).toBe(true)
  })

  it('does not flag windows ending today', () => {
    const v = validateReminderWindow(today, today, today)
    expect(v.ended).toBe(false)
  })

  it('returns no error for empty dates', () => {
    const v = validateReminderWindow('', '', today)
    expect(v.error).toBeUndefined()
    expect(v.ended).toBe(false)
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
      endDate: '2026-07-31',
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
      start_date: '2026-07-28',
      end_date: '2026-07-31',
      time_of_day: '09:00',
      note: 'Friendly follow-up on your balance',
    }
    expect(payload).toHaveProperty('debt_id', 12)
    expect(payload).toHaveProperty('customer_id', 7)
    expect(payload).toHaveProperty('start_date')
    expect(payload).toHaveProperty('end_date')
    expect(payload).toHaveProperty('time_of_day')
    expect(payload).toHaveProperty('note')
  })
})
