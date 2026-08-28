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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-light mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  )
}

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white'

export const disposalInputClass =
  'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-gray-50 text-gray-500 cursor-not-allowed'