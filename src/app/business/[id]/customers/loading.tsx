import PageSkeleton, { StatCardsSkeleton, FilterBarSkeleton, ListSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return (
    <PageSkeleton>
      <StatCardsSkeleton />
      <FilterBarSkeleton />
      <ListSkeleton rows={5} />
    </PageSkeleton>
  )
}