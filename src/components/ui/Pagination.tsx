import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

/**
 * Pagination control for client-side paginated collections.
 *
 * Renders a condensed window of page numbers with ellipses so the control stays
 * a fixed width whether there are 5 rows or 5,000. Fully keyboard accessible:
 * each control is a real <button> with an accessible name and aria-current on
 * the active page.
 */

function buildPages(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | 'gap')[] = []
  const push = (n: number) => pages.push(n)

  push(1)
  // Always show immediate neighbours of the current page.
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('gap')
  for (let i = start; i <= end; i++) push(i)
  if (end < total - 1) pages.push('gap')
  push(total)

  return pages
}

export default function Pagination({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
  className?: string
}) {
  if (pageCount <= 1) return null

  const from = (page - 1) * (pageSize ?? 0) + 1
  const to = Math.min(page * (pageSize ?? 0), totalItems ?? 0)

  const navBtn =
    'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-600 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white'

  return (
    <div
      className={`flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 sm:flex-row sm:px-6 ${className}`}
    >
      {totalItems != null && (
        <p className="text-xs text-neutral-light">
          Showing <span className="font-medium text-slate-700">{from}</span>-
          <span className="font-medium text-slate-700">{to}</span> of{' '}
          <span className="font-medium text-slate-700">{totalItems}</span>
        </p>
      )}

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={navBtn}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {buildPages(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1.5 text-sm text-neutral-light" aria-hidden="true">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={
                p === page
                  ? 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-dark'
                  : navBtn
              }
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={navBtn}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}