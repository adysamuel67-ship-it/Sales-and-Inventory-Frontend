
const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})/

export function dateKey(value?: string | null): string {
  const match = DATE_KEY.exec(value || '')
  if (!match) return ''
  const [, year, month, day] = match
  const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    probe.getUTCFullYear() !== Number(year) ||
    probe.getUTCMonth() !== Number(month) - 1 ||
    probe.getUTCDate() !== Number(day)
  ) {
    return ''
  }
  return `${year}-${month}-${day}`
}

export function todayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function addDays(dateStr: string, days: number): string {
  const key = dateKey(dateStr)
  if (!key) return ''
  const d = new Date(key + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function compareDateKeys(a: string, b: string): number {
  const left = dateKey(a) || a
  const right = dateKey(b) || b
  return left < right ? -1 : left > right ? 1 : 0
}

export function daysUntilDateKey(dateStr?: string | null, now: Date = new Date()): number | null {
  const key = dateKey(dateStr)
  if (!key) return null
  return Math.round(
    (Date.parse(key + 'T00:00:00Z') - Date.parse(todayDateKey(now) + 'T00:00:00Z')) / 86400000
  )
}

export function formatDateLabel(dateStr?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  const key = dateKey(dateStr)
  if (!key) return ''
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    opts ?? { month: 'short', day: 'numeric', year: 'numeric' }
  )
}

export function timeLabel(value?: string | null, fallback = '09:00'): string {
  const v = (value || '').trim()
  if (!v) return fallback
  return v.slice(0, 5)
}

export function hasUtcOffset(value?: string | null): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/.test((value || '').trim())
}