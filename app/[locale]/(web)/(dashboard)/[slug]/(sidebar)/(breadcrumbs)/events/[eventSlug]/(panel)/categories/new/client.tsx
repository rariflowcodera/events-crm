"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { CategoryForm } from "@/components/guests/category-form"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"

interface CategoryNewPageClientProps {
  workspaceSlug: string
  eventSlug: string
}

export function CategoryNewPageClient({ workspaceSlug, eventSlug }: CategoryNewPageClientProps) {
  const router = useRouter()
  const t = useTranslations("categories")

  // Fetch event data
  const { data: event, isLoading } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Fallback URL for back navigation - include tab=categories to return to Categories tab
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=categories"

  const handleSuccess = () => {
    router.push(backHref)
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <PagePanel title={t("add")} backHref={backHref}>
        <CategoryFormSkeleton />
      </PagePanel>
    )
  }

  if (!event) {
    return null
  }

  return (
    <PagePanel
      title={t("add")}
      description="Create a new guest category for this event"
      backHref={backHref}
    >
      <CategoryForm
        eventId={event.id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PagePanel>
  )
}

function CategoryFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Name & Code */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <div className="flex gap-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
