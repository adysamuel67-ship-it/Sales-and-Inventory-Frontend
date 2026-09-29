const base = 'rounded-2xl border border-slate-200 bg-white shadow-card'

export function Card({
  children,
  className = '',
  padded = true,
  as: As = 'div',
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
  as?: 'div' | 'section' | 'article'
}) {
  return <As className={`${base} ${padded ? 'p-5 sm:p-6' : ''} ${className}`}>{children}</As>
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-section-title text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-neutral-light">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export default Card
