import Skeleton from './Skeleton'

export default function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Mirrors the real PageHeader proportions so the layout does not jump
          when the data arrives. */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-32 rounded-xl sm:block" />
      </div>
      {children}
      <span className="sr-only">Loading</span>
    </div>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="w-full space-y-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 5, className = 'h-16 rounded-xl' }: { rows?: number; className?: string }) {
  return (
    <div className="surface-card overflow-hidden">
      {/* Skeleton a real table header so the loading state has the same shape
          as the loaded state. */}
      <div className="border-b border-slate-200 bg-surfaceAlt px-5 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-slate-100 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 ${i > 0 ? 'pt-4' : ''}`}>
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className={`${className} !h-7 !w-20 shrink-0`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function FilterBarSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-10 flex-1 rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl sm:w-40" />
    </div>
  )
}