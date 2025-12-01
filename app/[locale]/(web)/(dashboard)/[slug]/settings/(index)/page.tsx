import { Metadata } from "next"

import { redirectToRoute, ROUTES } from "@/lib/routes"

export const metadata: Metadata = ROUTES.settings.metadata

type SettingsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params

  return redirectToRoute("settings-workspace", { slug })
}
