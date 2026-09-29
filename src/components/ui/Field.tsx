export function labelClass(required = false) {
  return `block text-[13px] font-medium text-slate-700${required ? ' text-danger' : ''}`
}

/**
 * Form field wrapper: label, control, and helper/validation text.
 *
 * Wires up the accessibility contract that plain markup usually misses —
 * `aria-describedby` pointing at the hint or error, and `aria-invalid` on the
 * control so screen readers announce the failure with the field, not later.
 */
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
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined
  const errorId = htmlFor ? `${htmlFor}-error` : undefined

  // Clone the single control child so it inherits the correct ARIA wiring
  // without every call site having to remember it.
  const control =
    typeof children === 'object' && children !== null && 'props' in (children as any)
      ? (() => {
          const child = children as React.ReactElement<any>
          return {
            ...child,
            props: {
              ...child.props,
              id: child.props.id ?? htmlFor,
              'aria-invalid': error ? true : undefined,
              'aria-describedby': error ? errorId : hint ? hintId : undefined,
            },
          }
        })()
      : children

  return (
    <div>
      <label htmlFor={htmlFor} className={`${labelClass(required)} mb-1.5`}>
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-neutral-light">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-danger">
          <svg className="mt-px h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-8-4a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1zm-1 8a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Shared control styling. Every input in the product gets the same border,
 * radius, focus ring and disabled treatment so forms feel like one system.
 */
const controlBase =
  'w-full min-h-[44px] rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 ' +
  'shadow-xs transition-all duration-150 ' +
  'focus:outline-none focus:ring-4 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

const controlOk =
  'border-slate-300 hover:border-slate-400 focus:border-primary focus:ring-primary/10'

const controlError =
  'border-rose-300 bg-rose-50/40 hover:border-rose-400 focus:border-danger focus:ring-danger/10'

/** Applies the error treatment when a field is in a failed state. */
export const fieldStateClass = (error?: boolean) => (error ? controlError : controlOk)

export const inputClass = `px-3.5 py-2.5 ${controlBase} ${controlOk}`

export const inputErrorClass = `px-3.5 py-2.5 ${controlBase} ${controlError}`

export const selectClass =
  'w-full min-h-[44px] cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white ' +
  'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke-width=\'2\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")] ' +
  'bg-[length:16px] bg-[right_0.875rem_center] bg-no-repeat py-2.5 pl-3.5 pr-10 text-sm text-slate-900 shadow-xs ' +
  'transition-all duration-150 hover:border-slate-400 ' +
  'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

export const selectErrorClass =
  'border-rose-300 bg-rose-50/40 focus:border-danger focus:ring-danger/10'

export const disposalInputClass =
  'w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed'

export const textareaClass = `min-h-[96px] resize-y py-2.5 ${controlBase} ${controlOk}`
