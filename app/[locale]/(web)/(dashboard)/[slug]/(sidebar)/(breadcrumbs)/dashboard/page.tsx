import { Metadata } from "next"
import Image from "next/image"

import { configuration } from "@/lib/config"
import { createRoute, ROUTES } from "@/lib/routes"
import { trpc } from "@/trpc/server"
import { CtaCard } from "@/components/global/cta-card"
import { SectionWrapper } from "@/components/layout/section-wrapper"

export const metadata: Metadata = ROUTES.dashboard.metadata

type DashboardPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { slug } = await params

  // Fetch workspace branding for logo
  const branding = await trpc.workspaces.getBranding({ slug })
  const logoSrc = branding?.branding?.logo || "/logo.svg"

  return (
    <SectionWrapper className="max-w-2xl gap-y-8">
      <div className="flex flex-col items-center justify-center gap-y-4">
        <Image
          src={logoSrc}
          width={200}
          height={80}
          alt={configuration.site.name + " Logo"}
          className="max-h-20 w-auto object-contain"
        />
        <h1 className="text-center text-xl font-bold">Welcome to {configuration.site.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CtaCard
          color="orange"
          href={createRoute("events", { slug }).href}
          heading="Manage Events"
          description="Create and manage events, guests, and RSVPs"
          icon="calendar"
        />
        <CtaCard
          color="blue"
          href={createRoute("settings-workspace", { slug }).href}
          heading="Workspace Settings"
          description="Configure your workspace settings and preferences"
          icon="settings"
        />
        <CtaCard
          color="green"
          href={createRoute("analytics", { slug }).href}
          heading="View Analytics"
          description="View analytics for your workspace and track performance"
          icon="chart"
        />
        <CtaCard
          color="purple"
          href={createRoute("settings-members", { slug }).href}
          heading="Invite members"
          description="Invite team members to collaborate in your workspace"
          icon="userPlus"
        />
      </div>
    </SectionWrapper>
  )
}
