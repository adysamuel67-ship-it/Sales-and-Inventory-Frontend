type BadgeColor = 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'slate' | 'rose' | 'indigo'
type BadgeSize = 'sm' | 'md'

/**
 * Subtle status badge.
 *
 * Tinted surface + hairline ring + deep matching text. High enough contrast to
 * stay legible, low enough saturation that a column full of them does not
 * compete with the primary CTA or the data itself.
 */
export default function Badge({
  color = 'slate',
  size = 'sm',
  children,
  icon,
  dot,
  className = '',
}: {
  color?: BadgeColor
  size?: BadgeSize
  children: React.ReactNode
  icon?: React.ReactNode
  /** Renders a leading status dot — the standard way to show live state. */
  dot?: boolean
  className?: string
}) {
  const map: Record<BadgeColor, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    purple: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    indigo: 'bg-primary-light text-primary-dark ring-primary/20',
    slate: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  }

  const dots: Record<BadgeColor, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    rose: 'bg-rose-500',
    purple: 'bg-violet-500',
    indigo: 'bg-primary',
    slate: 'bg-slate-400',
  }

  const sizes: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[11px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizes[size]} ${map[color]} ${className}`}
    >
      {dot && <span className={`status-dot !h-1.5 !w-1.5 ${dots[color]}`} aria-hidden="true" />}
      {icon}
      {children}
    </span>
  )
}