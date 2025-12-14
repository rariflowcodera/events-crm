import { Metadata } from "next"

import { HydrateClient } from "@/trpc/server"
import { ROUTES } from "@/lib/routes"
import { EventCreatePageClient } from "./client"

export const metadata: Metadata = ROUTES["event-create"].metadata
export const dynamic = "force-dynamic"

type EventCreatePageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function EventCreatePage({ params }: EventCreatePageProps) {
  const { slug } = await params

  return (
    <HydrateClient>
      <EventCreatePageClient workspaceSlug={slug} />
    </HydrateClient>
  )
}
