import { cookies } from "next/headers"

import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/navigation/app-sidebar"

type DashboardLayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const cookieStore = await cookies()
  const { slug } = await params

  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="grid w-full grid-cols-1 gap-0 md:grid-cols-[auto_1fr]">
        <AppSidebar slug={slug} />
        <section className="max-h-screen w-full max-w-full min-w-full py-2 pr-0 transition-colors duration-300 md:pr-2">
          <div className="border-foreground/[0.06] relative flex size-full flex-col overflow-hidden rounded-xl border">
            {children}
          </div>
        </section>
      </div>
    </SidebarProvider>
  )
}
