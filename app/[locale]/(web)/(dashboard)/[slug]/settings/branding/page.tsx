import { Metadata } from "next"
import { HydrateClient, trpc } from "@/trpc/server"

import { ROUTES } from "@/lib/routes"
import { SettingsWrapper } from "@/components/layout/settings-wrapper"
import { WorkspaceBrandingClient } from "@/components/workspace/workspace-branding-client"

export const metadata: Metadata = ROUTES["settings-branding"].metadata
export const dynamic = "force-dynamic"

type BrandingSettingsPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function BrandingSettingsPage({ params }: BrandingSettingsPageProps) {
  const { slug } = await params

  void trpc.workspaces.getBranding.prefetch({ slug })

  return (
    <HydrateClient>
      <SettingsWrapper title="Branding" description="Customize your workspace branding and colors">
        <WorkspaceBrandingClient slug={slug} />
      </SettingsWrapper>
    </HydrateClient>
  )
}
