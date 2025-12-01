import React from "react"

import { PermissionProvider } from "@/components/providers/permission-provider"

type DashboardLayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { slug } = await params

  return <PermissionProvider slug={slug}>{children}</PermissionProvider>
}
