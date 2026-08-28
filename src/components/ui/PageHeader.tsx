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
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-light hover:text-gray-700 transition-colors mb-1.5"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            {backLabel || 'Back'}
          </Link>
        )}
        {eyebrow && (
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{eyebrow}</p>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-light mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
    </div>
  )
}