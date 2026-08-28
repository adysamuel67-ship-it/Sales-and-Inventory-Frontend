export default function Card({
  children,
  className = '',
  padded = true,
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div className={`bg-surface rounded-2xl border border-gray-200 shadow-sm ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  icon,
  iconBg = 'bg-blue-50 text-blue-600',
  action,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  iconBg?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-light mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}