type AlertKind = 'error' | 'success' | 'warning' | 'info'

// Tinted surface + hairline ring in the matching hue, with a coloured icon and
// deep matching text. Reads as designed feedback rather than a browser default.
const styles: Record<AlertKind, { container: string; icon: string; role: string }> = {
  error: { container: 'bg-rose-50/70 border-rose-200 text-rose-800', icon: 'text-danger', role: 'alert' },
  success: { container: 'bg-emerald-50/70 border-emerald-200 text-emerald-800', icon: 'text-success', role: 'status' },
  warning: { container: 'bg-amber-50/70 border-amber-200 text-amber-900', icon: 'text-warning', role: 'alert' },
  info: { container: 'bg-primary-light/60 border-primary/20 text-indigo-900', icon: 'text-primary', role: 'status' },
}

function AlertIcon({ kind }: { kind: AlertKind }) {
  if (kind === 'success') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  }
  if (kind === 'warning') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  }
  if (kind === 'error') {
    return (
      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )
}

export default function Alert({
  kind = 'info',
  children,
  className = '',
  icon,
  title,
  onDismiss,
}: {
  kind?: AlertKind
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
  title?: string
  onDismiss?: () => void
}) {
  const style = styles[kind]
  return (
    <div
      role={style.role}
      className={`flex animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style.container} ${className}`}
    >
      <span className={`mt-0.5 shrink-0 ${style.icon}`}>
        {icon || <AlertIcon kind={kind} />}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5 leading-relaxed' : 'leading-relaxed'}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-0.5 shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}