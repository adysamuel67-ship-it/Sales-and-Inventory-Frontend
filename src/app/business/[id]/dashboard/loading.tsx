import PageSkeleton, { StatCardsSkeleton, FilterBarSkeleton, ListSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return (
    <PageSkeleton>
      <StatCardsSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FilterBarSkeleton />
          <div className="mt-6">
            <ListSkeleton rows={6} className="h-16 rounded-xl" />
          </div>
        </div>
        <ListSkeleton rows={6} className="h-16 rounded-xl" />
      </div>

      <ListSkeleton rows={4} />
    </PageSkeleton>
  )
}