import PageSkeleton, { FilterBarSkeleton, ListSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return (
    <PageSkeleton>
      <FilterBarSkeleton />
      <ListSkeleton rows={6} />
    </PageSkeleton>
  )
}