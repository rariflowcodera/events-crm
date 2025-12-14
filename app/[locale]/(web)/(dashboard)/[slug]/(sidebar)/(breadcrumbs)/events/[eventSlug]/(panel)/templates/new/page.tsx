import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { TemplateNewPageClient } from "./client"

export const metadata: Metadata = ROUTES["template-new"].metadata
export const dynamic = "force-dynamic"

type TemplateNewPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
  }>
}

export default async function TemplateNewPage({ params }: TemplateNewPageProps) {
  const { slug, eventSlug } = await params

  // Prefetch event (categories are fetched client-side after we have eventId)
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <TemplateNewPageClient workspaceSlug={slug} eventSlug={eventSlug} />
    </HydrateClient>
  )
}
