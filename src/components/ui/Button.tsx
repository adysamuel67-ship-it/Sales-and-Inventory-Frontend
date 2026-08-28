import Spinner from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline' | 'success'
type Size = 'sm' | 'md'

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  disabled,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed'

  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-danger text-white hover:bg-red-700',
    dangerOutline: 'text-danger bg-danger-light border border-red-200 hover:bg-red-100',
    success: 'bg-success text-white hover:bg-emerald-700',
  }

  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="w-4 h-4 border-2 border-t-transparent" /> : leftIcon}
      {children}
    </button>
  )
}