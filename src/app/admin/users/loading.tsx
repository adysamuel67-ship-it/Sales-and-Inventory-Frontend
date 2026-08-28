import PageSkeleton, { FilterBarSkeleton, ListSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return (
    <PageSkeleton>
      <FilterBarSkeleton />
      <ListSkeleton rows={5} className="h-14 rounded-xl" />
    </PageSkeleton>
  )
}