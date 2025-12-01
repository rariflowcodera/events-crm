import { ReactNode } from "react"

import { RouteConfigType, ROUTES } from "@/lib/routes"
import { SettingsSidebar } from "@/components/navigation/settings-sidebar"

const profileSettingsRoutes: RouteConfigType[] = [
  ROUTES["settings-profile"],
  ROUTES["settings-personalization"],
  ROUTES["settings-workspaces"],
]

const workspaceSettingsRoutes: RouteConfigType[] = [
  ROUTES["settings-workspace"],
  ROUTES["settings-members"],
  ROUTES["settings-branding"],
]

type SettingsLayoutProps = {
  children: ReactNode
  params: Promise<{
    slug: string
  }>
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { slug } = await params

  return (
    <div className="bg-os-background-100 dark:bg-os-background-200 grid size-full h-screen max-h-screen gap-x-10 px-4 md:grid-cols-[16rem_1fr]">
      <SettingsSidebar
        profileRoutes={profileSettingsRoutes}
        workspaceRoutes={workspaceSettingsRoutes}
        slug={slug}
      />
      <div className="bg-os-background-100 m-2 flex w-full flex-1 flex-col overflow-hidden rounded-xl border">
        {children}
      </div>
    </div>
  )
}
