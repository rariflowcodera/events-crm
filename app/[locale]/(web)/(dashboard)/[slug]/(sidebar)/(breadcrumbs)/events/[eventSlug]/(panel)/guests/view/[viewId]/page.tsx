import { Metadata } from "next"

import { HydrateClient, trpc } from "@/trpc/server"
import { GuestListViewPageClient } from "./client"

export const metadata: Metadata = {
  title: "Guest List View",
  description: "View guests with saved configuration",
}
export const dynamic = "force-dynamic"

type GuestListViewPageProps = {
  params: Promise<{
    slug: string
    eventSlug: string
    viewId: string
  }>
}

export default async function GuestListViewPage({ params }: GuestListViewPageProps) {
  const { slug, eventSlug, viewId } = await params

  // Prefetch sidebar navigation data (required for useSuspenseQuery in sidebar components)
  void trpc.events.getMany.prefetch({ workspaceSlug: slug })
  void trpc.workspaces.getNavigationSettings.prefetch({ slug })

  return (
    <HydrateClient>
      <GuestListViewPageClient
        workspaceSlug={slug}
        eventSlug={eventSlug}
        viewId={viewId}
      />
    </HydrateClient>
  )
}
