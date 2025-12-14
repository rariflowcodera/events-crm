import { Skeleton } from "@/components/ui/skeleton"

export default function GuestDetailLoading() {
  return (
    <div className="fixed inset-0 z-50 bg-background md:left-[var(--sidebar-width)]">
      {/* Header skeleton */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-6 py-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="p-6 space-y-6">
        {/* Status skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>

        {/* RSVP Link skeleton */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Contact info skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
