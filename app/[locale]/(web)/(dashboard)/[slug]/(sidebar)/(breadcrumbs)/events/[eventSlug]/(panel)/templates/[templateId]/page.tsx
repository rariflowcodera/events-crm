import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { TemplateDetailPageClient } from "./client"

export const metadata: Metadata = ROUTES["template-detail"].metadata
export const dynamic = "force-dynamic"

type TemplateDetailPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
    templateId: string
  }>
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { slug, eventSlug, templateId } = await params

  // Prefetch event and template (categories are fetched client-side after we have eventId)
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })
  void trpc.emailTemplates.getOne.prefetch({ templateId })

  return (
    <HydrateClient>
      <TemplateDetailPageClient
        workspaceSlug={slug}
        eventSlug={eventSlug}
        templateId={templateId}
      />
    </HydrateClient>
  )
}
