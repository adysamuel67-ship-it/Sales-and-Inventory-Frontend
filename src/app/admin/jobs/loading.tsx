import PageSkeleton, { ListSkeleton } from '@/components/ui/PageSkeleton'

export default function Loading() {
  return (
    <PageSkeleton>
      <ListSkeleton rows={4} className="h-16 rounded-xl" />
    </PageSkeleton>
  )
}