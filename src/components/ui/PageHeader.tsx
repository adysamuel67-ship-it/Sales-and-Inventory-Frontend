import Link from 'next/link'
import { ChevronLeftIcon } from './Icons'

/**
 * Page title block.
 *
 * Enforces the hierarchy for every screen: a small uppercase eyebrow, a
 * display-face title, a muted supporting line, then actions aligned to the
 * baseline on desktop and stacked on mobile.
 */
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
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {backLink && (
          <Link
            href={backLink}
            className="group mb-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-light transition-colors hover:text-slate-900"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            {backLabel || 'Back'}
          </Link>
        )}
        {eyebrow && (
          <p className="mb-1.5 text-micro uppercase tracking-[0.08em] text-primary">{eyebrow}</p>
        )}
        <h1 className="text-page-title text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-light">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:pt-6">{actions}</div>
      )}
    </div>
  )
}