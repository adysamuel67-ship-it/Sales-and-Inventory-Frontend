export default function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`px-5 py-14 text-center ${className}`}>
      <div className="w-14 h-14 bg-slate-50 ring-1 ring-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon ? (
          icon
        ) : (
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold tracking-tight text-slate-900">{title}</p>
      {description && <p className="text-[15px] leading-relaxed text-slate-500 mt-1.5 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}