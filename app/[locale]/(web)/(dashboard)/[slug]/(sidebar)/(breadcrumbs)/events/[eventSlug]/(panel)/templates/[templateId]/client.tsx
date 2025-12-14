"use client"

import { useRouter } from "next/navigation"
import { notFound } from "next/navigation"
import { useTranslations } from "next-intl"

import { trpc } from "@/trpc/client"
import { PagePanel } from "@/components/global/page-panel"
import { EmailTemplateForm } from "@/components/email-templates/email-template-form"
import { Skeleton } from "@/components/ui/skeleton"
import { createRoute } from "@/lib/routes"

interface TemplateDetailPageClientProps {
  workspaceSlug: string
  eventSlug: string
  templateId: string
}

export function TemplateDetailPageClient({
  workspaceSlug,
  eventSlug,
  templateId,
}: TemplateDetailPageClientProps) {
  const router = useRouter()
  const t = useTranslations("emailTemplate")

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent } = trpc.events.getBySlug.useQuery(
    { workspaceSlug, eventSlug },
    { enabled: !!workspaceSlug && !!eventSlug }
  )

  // Fetch template data
  const { data: template, isLoading: isLoadingTemplate } = trpc.emailTemplates.getOne.useQuery(
    { templateId },
    { enabled: !!templateId }
  )

  // Fetch categories (requires eventId from event)
  const { data: categoriesData, isLoading: isLoadingCategories } = trpc.guestCategories.getMany.useQuery(
    { eventId: event?.id ?? "" },
    { enabled: !!event?.id }
  )

  const isLoading = isLoadingEvent || isLoadingTemplate || isLoadingCategories

  // Fallback URL for back navigation - include tab=emails to return to Emails tab
  const backHref = createRoute("event-detail", { slug: workspaceSlug, eventSlug }).href + "?tab=emails"

  const handleSuccess = () => {
    router.push(backHref)
  }

  const handleCancel = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <PagePanel title="Loading..." backHref={backHref}>
        <TemplateFormSkeleton />
      </PagePanel>
    )
  }

  if (!event || !template) {
    notFound()
  }

  return (
    <PagePanel
      title={template.name}
      description="Edit email template"
      backHref={backHref}
    >
      <EmailTemplateForm
        eventId={event.id}
        templateId={templateId}
        categories={categoriesData || []}
        workspaceSlug={workspaceSlug}
        eventSlug={eventSlug}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </PagePanel>
  )
}

function TemplateFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Type & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Editor tabs */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
