import { Metadata } from "next"
import Image from "next/image"

import { configuration } from "@/lib/config"
import { ROUTES } from "@/lib/routes"
import { trpc } from "@/trpc/server"
import { SectionWrapper } from "@/components/layout/section-wrapper"
import { DashboardCards } from "@/components/dashboard/dashboard-cards"

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

      <DashboardCards slug={slug} />
    </SectionWrapper>
  )
}
