import {
  addDays,
  compareDateKeys,
  dateKey,
  daysUntilDateKey,
  formatDateLabel,
  hasUtcOffset,
  timeLabel,
  todayDateKey,
} from '@/lib/dates'

describe('dateKey', () => {
  it('keeps the date part of a full API timestamp', () => {
    expect(dateKey('2026-10-06T00:00:00Z')).toBe('2026-10-06')
  })

  it('accepts a bare date', () => {
    expect(dateKey('2026-10-06')).toBe('2026-10-06')
  })

  it('rejects junk', () => {
    expect(dateKey('')).toBe('')
    expect(dateKey('not-a-date')).toBe('')
    expect(dateKey(undefined)).toBe('')
    expect(dateKey(null)).toBe('')
  })

  it('rejects an impossible calendar date', () => {
    expect(dateKey('2026-02-31')).toBe('')
    expect(dateKey('2026-13-01')).toBe('')
  })
})

describe('compareDateKeys', () => {
  it('orders by calendar day', () => {
    expect(compareDateKeys('2026-07-28', '2026-07-31')).toBeLessThan(0)
    expect(compareDateKeys('2026-07-31', '2026-07-28')).toBeGreaterThan(0)
    expect(compareDateKeys('2026-07-31', '2026-07-31')).toBe(0)
  })

  it('crosses month and year boundaries', () => {
    expect(compareDateKeys('2026-01-31', '2026-02-01')).toBeLessThan(0)
    expect(compareDateKeys('2026-12-31', '2027-01-01')).toBeLessThan(0)
  })

  it('ignores the time component of an API timestamp', () => {
    expect(compareDateKeys('2026-07-31T23:59:59Z', '2026-07-31T00:00:00Z')).toBe(0)
  })
})

describe('addDays', () => {
  it('adds and subtracts across boundaries', () => {
    expect(addDays('2026-10-06', 1)).toBe('2026-10-07')
    expect(addDays('2026-10-06', -1)).toBe('2026-10-05')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('crosses a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('returns empty for unusable input', () => {
    expect(addDays('nope', 1)).toBe('')
  })
})

describe('daysUntilDateKey', () => {
  const now = new Date('2026-10-03T12:00:00Z')

  it('is 0 for today', () => {
    expect(daysUntilDateKey('2026-10-03', now)).toBe(0)
  })

  it('counts forward', () => {
    expect(daysUntilDateKey('2026-10-10', now)).toBe(7)
  })

  it('counts backward once past', () => {
    expect(daysUntilDateKey('2026-10-01', now)).toBe(-2)
  })

  it('returns null for an unusable date', () => {
    expect(daysUntilDateKey('nope', now)).toBeNull()
    expect(daysUntilDateKey(undefined, now)).toBeNull()
  })
})

describe('formatDateLabel', () => {
  it('renders the calendar day the key names', () => {
    expect(formatDateLabel('2026-10-06')).toBe(
      new Date(2026, 9, 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    )
  })

  it.each(['2026-01-01', '2026-10-06', '2026-12-31'])(
    'does not shift %s by a day',
    (key) => {
      const [y, m, d] = key.split('-').map(Number)
      expect(formatDateLabel(key)).toBe(
        new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      )
    }
  )

  it('honours custom options', () => {
    expect(formatDateLabel('2026-10-06', { month: 'long', day: 'numeric' })).toBe('October 6')
  })

  it('returns empty for an unusable date', () => {
    expect(formatDateLabel('nope')).toBe('')
  })
})

describe('timeLabel', () => {
  it('trims an API TIME to HH:MM', () => {
    expect(timeLabel('09:30:00')).toBe('09:30')
  })

  it('falls back when absent', () => {
    expect(timeLabel(null)).toBe('09:00')
    expect(timeLabel('')).toBe('09:00')
    expect(timeLabel(undefined, '12:00')).toBe('12:00')
  })
})

describe('hasUtcOffset', () => {
  it('detects an explicit offset', () => {
    expect(hasUtcOffset('2026-10-05T09:00:00Z')).toBe(true)
    expect(hasUtcOffset('2026-10-05T09:00:00+02:00')).toBe(true)
  })

  it('reports a naive timestamp', () => {
    expect(hasUtcOffset('2026-10-05T09:00:00')).toBe(false)
    expect(hasUtcOffset('')).toBe(false)
  })
})

describe('todayDateKey', () => {
  it('matches the UTC calendar day', () => {
    expect(todayDateKey(new Date('2026-10-03T23:59:59Z'))).toBe('2026-10-03')
    expect(todayDateKey(new Date('2026-10-04T00:00:00Z'))).toBe('2026-10-04')
  })
})