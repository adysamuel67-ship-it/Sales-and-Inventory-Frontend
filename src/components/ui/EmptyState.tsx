export default function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className = '',
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div className={`px-5 text-center ${compact ? 'py-10' : 'py-16'} ${className}`}>
      {/* Soft tinted plate rather than a bare icon floating in whitespace. */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        {icon ? (
          <span className="text-neutral-light">{icon}</span>
        ) : (
          <svg
            className="h-6 w-6 text-neutral-light"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-neutral-light">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}