import Skeleton from './Skeleton'

export default function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="hidden sm:block h-11 w-32 rounded-xl" />
      </div>
      {children}
    </div>
  )
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 5, className = 'h-14 rounded-xl' }: { rows?: number; className?: string }) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-200 shadow-sm p-5">
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={className} />
        ))}
      </div>
    </div>
  )
}

export function FilterBarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="h-11 flex-1 rounded-xl" />
      <Skeleton className="h-11 w-40 rounded-xl" />
    </div>
  )
}