export default function Spinner({ className = 'h-4 w-4 border-2 border-current border-t-transparent' }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

/** Full-area loading state for a route or panel. */
export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20" role="status" aria-live="polite">
      <span className="relative flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-slate-200" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </span>
      <p className="text-sm text-neutral-light">{label}</p>
    </div>
  )
}