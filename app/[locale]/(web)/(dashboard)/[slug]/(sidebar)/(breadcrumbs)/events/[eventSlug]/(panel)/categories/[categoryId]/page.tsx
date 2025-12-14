import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { CategoryDetailPageClient } from "./client"

export const metadata: Metadata = ROUTES["category-detail"].metadata
export const dynamic = "force-dynamic"

type CategoryDetailPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
    categoryId: string
  }>
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug, eventSlug, categoryId } = await params

  // Prefetch event and category
  void trpc.events.getBySlug.prefetch({ workspaceSlug: slug, eventSlug })
  void trpc.guestCategories.getOne.prefetch({ categoryId })

  return (
    <HydrateClient>
      <CategoryDetailPageClient
        workspaceSlug={slug}
        eventSlug={eventSlug}
        categoryId={categoryId}
      />
    </HydrateClient>
  )
}
