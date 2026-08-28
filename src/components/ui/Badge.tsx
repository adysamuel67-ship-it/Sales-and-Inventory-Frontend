type BadgeColor =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'purple'
  | 'slate'
  | 'gray'
  | 'rose'

export default function Badge({
  color = 'slate',
  children,
  icon,
  className = '',
}: {
  color?: BadgeColor
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}) {
  const map: Record<BadgeColor, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    red: 'bg-red-50 text-red-700 ring-red-100',
    purple: 'bg-purple-50 text-purple-700 ring-purple-100',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    gray: 'bg-gray-100 text-gray-600 ring-gray-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ring-1 ${map[color]} ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}