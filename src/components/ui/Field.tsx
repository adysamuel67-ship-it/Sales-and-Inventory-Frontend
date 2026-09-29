export function labelClass(required = false) {
  return `block text-sm font-medium text-slate-700 mb-1.5${required ? ' text-danger' : ''}`
}

export default function Field({
  label,
  htmlFor,
  hint,
  required,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass(required)}>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  )
}

export const inputClass =
  'w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20'

export const selectClass =
  'w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20'

export const disposalInputClass =
  'w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed'
