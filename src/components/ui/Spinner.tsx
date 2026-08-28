export default function Spinner({ className = 'w-4 h-4 border-2 border-current border-t-transparent' }: { className?: string }) {
  return <div className={`${className} rounded-full animate-spin shrink-0`} aria-label="Loading" />
}

export function PageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-neutral-light">{label}</p>
    </div>
  )
}