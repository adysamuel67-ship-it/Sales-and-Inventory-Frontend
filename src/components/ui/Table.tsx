import EmptyState from './EmptyState'

/**
 * Production-grade data table primitives.
 *
 * Structure is exposed as composable sub-components so pages keep full control
 * over their own markup, while the shared look (muted header, hairline
 * dividers, row hover, alignment) comes from the `.data-table` component class
 * in globals.css. Every cell wrapper is optional-passthrough so a page can pass
 * `colSpan`, `className` and click handlers straight through to the DOM node.
 */

function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`data-table w-full border-collapse ${className}`}>{children}</table>
    </div>
  )
}

function TableHead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={className}>
      <tr>{children}</tr>
    </thead>
  )
}

type Align = 'left' | 'center' | 'right'

// Tailwind scans source text for complete class names, so these must be
// literal strings - never interpolated (`text-${align}` would be purged).
const ALIGN: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/** A single header cell. `align` keeps numeric columns right-aligned. */
function TableHeaderCell({
  children,
  align = 'left',
  className = '',
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return (
    <th
      scope="col"
      className={`${ALIGN[align]} ${className}`}
      {...rest}
    >
      {children}
    </th>
  )
}

function TableBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>
}

function TableRow({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

/** A body cell. `align` keeps numeric columns right-aligned. */
function TableCell({
  children,
  align = 'left',
  className = '',
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return (
    <td className={`${ALIGN[align]} ${className}`} {...rest}>
      {children}
    </td>
  )
}

/** Right-aligned "N results" summary that sits above a table. */
export function TableMeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-xs text-neutral-light ${className}`}>{children}</p>
  )
}

/**
 * Wraps a table in a card with an optional header, and handles the
 * loading / empty / populated states so no page has to reinvent them.
 */
export function DataTableCard({
  children,
  title,
  subtitle,
  action,
  meta,
  isLoading,
  empty,
  className = '',
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
  meta?: React.ReactNode
  isLoading?: boolean
  empty?: React.ReactNode
  className?: string
}) {
  const showEmpty = !isLoading && empty

  return (
    <section className={`surface-card overflow-hidden ${className}`}>
      {(title || action || meta) && (
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-section-title text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-neutral-light">{subtitle}</p>}
            {meta && <div className="mt-1">{meta}</div>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}

      {isLoading ? (
        <div className="space-y-3 p-5 sm:p-6" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-1/3" />
                <div className="skeleton h-3 w-1/4" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
          <span className="sr-only">Loading data</span>
        </div>
      ) : showEmpty ? (
        <>{empty}</>
      ) : (
        children
      )}
    </section>
  )
}

export function TableEmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <EmptyState title={title} description={description} icon={undefined} action={action} />
}

export { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell }
export default Table