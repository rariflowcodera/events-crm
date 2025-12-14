import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { FormDetailPageClient } from "./client"

export const metadata: Metadata = ROUTES["form-detail"].metadata
export const dynamic = "force-dynamic"

type FormDetailPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
    formSlug: string
  }>
}

export default async function FormDetailPage({ params }: FormDetailPageProps) {
  const { slug, eventSlug, formSlug } = await params

  // Prefetch event data
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <FormDetailPageClient
        workspaceSlug={slug}
        eventSlug={eventSlug}
        formSlug={formSlug}
      />
    </HydrateClient>
  )
}
