import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { CategoryNewPageClient } from "./client"

export const metadata: Metadata = ROUTES["category-new"].metadata
export const dynamic = "force-dynamic"

type CategoryNewPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
  }>
}

export default async function CategoryNewPage({ params }: CategoryNewPageProps) {
  const { slug, eventSlug } = await params

  // Prefetch event
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })

  return (
    <HydrateClient>
      <CategoryNewPageClient workspaceSlug={slug} eventSlug={eventSlug} />
    </HydrateClient>
  )
}
