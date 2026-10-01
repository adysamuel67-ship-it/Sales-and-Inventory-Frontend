export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function formatShortTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Chat wallpaper: a soft neutral canvas with a barely-there paper texture. The
// old blue-tinted dotted grid read as graph paper; at this contrast it just
// gives the bubbles somewhere to sit.
export const chatWallpaper = {
  backgroundColor: '#F0F2F5',
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.04) 1px, transparent 0)',
  backgroundSize: '22px 22px',
}

// Bubble fills. The tail is drawn as a CSS triangle in a sibling element, so
// it cannot inherit the colour from the bubble the way it would if it were a
// child. These mirror the Tailwind tokens on the bubble itself (primary.DEFAULT
// and white) so the two cannot drift apart.
export const BUBBLE_SELF_BG = '#4F46E5'
export const BUBBLE_OTHER_BG = '#FFFFFF'

export function dayLabel(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const day = startOf(d)
  if (day === startOf(today)) return 'Today'
  if (day === startOf(yesterday)) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}