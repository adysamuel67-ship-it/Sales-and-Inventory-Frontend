import Link from 'next/link'
import { ChevronLeftIcon } from './Icons'

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  backLink,
  backLabel,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  backLink?: string
  backLabel?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      <div className="min-w-0">
        {backLink && (
          <Link
            href={backLink}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-1.5"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            {backLabel || 'Back'}
          </Link>
        )}
        {eyebrow && (
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">{eyebrow}</p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  )
}