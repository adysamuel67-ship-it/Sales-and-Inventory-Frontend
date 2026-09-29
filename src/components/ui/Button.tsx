import Spinner from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline' | 'success' | 'outline'
type Size = 'xs' | 'sm' | 'md' | 'lg'

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
}) {
  // Shared interaction model: a crisp focus ring, a slight press on active, and
  // a colour shift on hover. `active:scale-[0.98]` gives the press feedback that
  // makes a control feel physical rather than flat.
  const base =
    'relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap ' +
    'transition-all duration-150 ease-smooth ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ' +
    'active:scale-[0.98] ' +
    'disabled:pointer-events-none disabled:opacity-55'

  // The accent is reserved for primary CTAs. Everything else stays neutral so
  // the one action we want clicked reads as the one action on the screen.
  const variants: Record<Variant, string> = {
    primary:
      'bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-dark hover:shadow-md hover:shadow-primary/20',
    secondary:
      'bg-white text-slate-700 border border-slate-300 shadow-xs hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900',
    outline:
      'bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-danger text-white shadow-sm shadow-danger/20 hover:bg-rose-700',
    dangerOutline: 'bg-white text-danger border border-rose-200 hover:bg-rose-50 hover:border-rose-300',
    success: 'bg-success text-white shadow-sm shadow-success/20 hover:bg-emerald-700',
  }

  // Vertical padding is tuned per size so every control in the system shares a
  // consistent optical weight and sits on the 8px grid.
  const sizes: Record<Size, string> = {
    xs: 'h-8 px-2.5 text-xs',
    sm: 'h-9 px-3.5 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner className="h-4 w-4 border-2 border-current border-t-transparent" />
          {/* Keep the label in the DOM so the button does not resize while
              loading, but hide it from assistive tech to avoid double text. */}
          <span className="invisible" aria-hidden="true">
            {children}
          </span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  )
}