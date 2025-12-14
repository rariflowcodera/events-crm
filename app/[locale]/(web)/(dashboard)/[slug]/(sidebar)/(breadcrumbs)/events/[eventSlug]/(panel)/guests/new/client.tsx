"use client"

import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { AddGuestForm } from "@/components/guests/add-guest-form"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"

interface AddGuestPageClientProps {
  workspaceSlug: string
  eventSlug: string
}

export function AddGuestPageClient({ workspaceSlug, eventSlug }: AddGuestPageClientProps) {
  const router = useRouter()
  const t = useTranslations("guest")

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Fetch categories (requires eventId from event)
  const { data: categoriesData, isLoading: isLoadingCategories } = trpc.guestCategories.getMany.useQuery(
    { eventId: event?.id ?? "" },
    { enabled: !!event?.id }
  )

  const isLoading = isLoadingEvent || isLoadingCategories

  // Fallback URL for back navigation - include tab=guests to return to Guests tab
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=guests"

  const handleSuccess = () => {
    router.push(backHref)
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <PagePanel title={t("add")} backHref={backHref}>
        <AddGuestFormSkeleton />
      </PagePanel>
    )
  }

  if (!event) {
    return null
  }

  return (
    <PagePanel
      title={t("add")}
      description="Add a new guest to this event. They will receive an RSVP link."
      backHref={backHref}
    >
      <AddGuestForm
        eventId={event.id}
        categories={categoriesData || []}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PagePanel>
  )
}

function AddGuestFormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Phone & Country */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
