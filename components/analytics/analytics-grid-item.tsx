import { Skeleton } from "@/components/ui/skeleton"

type AnalyticsGridItemProps = {
  title: string
  number: number
}

export function AnalyticsGridItem({ title, number }: AnalyticsGridItemProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm">{title}</div>
      <div className="text-2xl font-bold">{number}</div>
    </div>
  )
}

export function AnalyticsGridItemSkeleton() {
  return <Skeleton className="rounded-lg border bg-card p-4" />
}
